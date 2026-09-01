import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import { INTERNAL_EVENT_TYPES, InternalEventPublisher } from '../../events/application/internal-event.contracts.js'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { RITUAL_TIMER_SECONDS, RITUAL_TOTAL_CYCLES } from '../domain/ritual-definition.js'
import { RitualRepository, type RitualChangeResult, type RitualDayView } from '../application/ritual.repository.js'

type Transaction = Prisma.TransactionClient
type DayRecord = Prisma.RitualDayGetPayload<{ include: { checks: true } }>

@Injectable()
export class PrismaRitualRepository extends RitualRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: InternalEventPublisher<Transaction>,
  ) { super() }

  findMine(context: CurrentTenantContext, range: { from: Date; to: Date }, now: Date): Promise<RitualDayView[] | null> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockMembership(tx, context.membershipId)
      if (!await this.activeMembership(tx, context)) return null
      const days = await tx.ritualDay.findMany({
        where: { tenantId: context.tenantId, membershipId: context.membershipId, ritualDate: { gte: range.from, lte: range.to } },
        orderBy: { ritualDate: 'asc' },
        include: { checks: { orderBy: [{ sectionKey: 'asc' }, { itemKey: 'asc' }] } },
      })
      const settled: DayRecord[] = []
      for (const day of days) settled.push(await this.settleTimer(tx, day, now))
      return settled.map((day) => this.toView(day, now))
    })
  }

  setCheck(context: CurrentTenantContext, date: Date, sectionKey: string, itemKey: string, completed: boolean, now: Date): Promise<RitualChangeResult> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockMembership(tx, context.membershipId)
      const membership = await this.activeMembership(tx, context)
      if (!membership) return { kind: 'context-not-found' }
      if (date > this.currentDateIn(membership.tenant.timeZone, now)) return { kind: 'future-date' }
      const day = await this.settleTimer(tx, await this.ensureDay(tx, context, date), now)
      const key = { ritualDayId_sectionKey_itemKey: { ritualDayId: day.id, sectionKey, itemKey } }
      if (completed) {
        const sourceKey = `ritual-check:${day.id}:${sectionKey}:${itemKey}`
        const [existingCheck, existingEvent] = await Promise.all([
          tx.ritualCheck.findUnique({ where: key, select: { ritualDayId: true } }),
          tx.internalEvent.findUnique({
            where: { type_sourceKey: { type: INTERNAL_EVENT_TYPES.ritualCheckCompleted, sourceKey } },
            select: { id: true },
          }),
        ])
        await tx.ritualCheck.upsert({
          where: key,
          create: { ritualDayId: day.id, tenantId: context.tenantId, membershipId: context.membershipId, sectionKey, itemKey },
          update: {},
        })
        if (!existingCheck && !existingEvent) {
          await this.events.publish(tx, {
            tenantId: context.tenantId,
            type: INTERNAL_EVENT_TYPES.ritualCheckCompleted,
            version: 1,
            aggregateType: 'RitualDay',
            aggregateId: day.id,
            sourceKey,
            payload: {
              membershipId: context.membershipId,
              ritualDate: date.toISOString().slice(0, 10),
              sectionKey,
              itemKey,
            },
            occurredAt: now,
          })
        }
      } else await tx.ritualCheck.deleteMany({ where: { ritualDayId: day.id, sectionKey, itemKey, tenantId: context.tenantId, membershipId: context.membershipId } })
      return { kind: 'changed', day: this.toView(await this.findDay(tx, day.id), now) }
    })
  }

  changeTimer(context: CurrentTenantContext, date: Date, action: 'start' | 'pause' | 'reset', now: Date): Promise<RitualChangeResult> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockMembership(tx, context.membershipId)
      const membership = await this.activeMembership(tx, context)
      if (!membership) return { kind: 'context-not-found' }
      if (date.getTime() !== this.currentDateIn(membership.tenant.timeZone, now).getTime()) return { kind: 'timer-date' }
      let day = await this.settleTimer(tx, await this.ensureDay(tx, context, date), now)
      if (action === 'reset') {
        day = await tx.ritualDay.update({
          where: { id: day.id },
          data: { completedCycles: 0, remainingSeconds: RITUAL_TIMER_SECONDS, runningStartedAt: null, runningUntil: null },
          include: { checks: true },
        })
      } else if (action === 'start' && day.completedCycles < RITUAL_TOTAL_CYCLES && !day.runningUntil) {
        day = await tx.ritualDay.update({
          where: { id: day.id },
          data: { runningStartedAt: now, runningUntil: new Date(now.getTime() + day.remainingSeconds * 1000) },
          include: { checks: true },
        })
      } else if (action === 'pause' && day.runningUntil) {
        const remainingSeconds = Math.max(1, Math.ceil((day.runningUntil.getTime() - now.getTime()) / 1000))
        day = await tx.ritualDay.update({
          where: { id: day.id },
          data: { remainingSeconds, runningStartedAt: null, runningUntil: null },
          include: { checks: true },
        })
      }
      return { kind: 'changed', day: this.toView(day, now) }
    })
  }

  private ensureDay(tx: Transaction, context: CurrentTenantContext, ritualDate: Date) {
    return tx.ritualDay.upsert({
      where: { membershipId_ritualDate: { membershipId: context.membershipId, ritualDate } },
      create: { tenantId: context.tenantId, membershipId: context.membershipId, ritualDate },
      update: {},
      include: { checks: true },
    })
  }

  private findDay(tx: Transaction, id: string) {
    return tx.ritualDay.findUniqueOrThrow({ where: { id }, include: { checks: { orderBy: [{ sectionKey: 'asc' }, { itemKey: 'asc' }] } } })
  }

  private async settleTimer(tx: Transaction, day: DayRecord, now: Date): Promise<DayRecord> {
    if (!day.runningUntil || day.runningUntil > now) return day
    const completedCycles = Math.min(RITUAL_TOTAL_CYCLES, day.completedCycles + 1)
    return tx.ritualDay.update({
      where: { id: day.id },
      data: {
        completedCycles,
        remainingSeconds: completedCycles === RITUAL_TOTAL_CYCLES ? 0 : RITUAL_TIMER_SECONDS,
        runningStartedAt: null,
        runningUntil: null,
      },
      include: { checks: { orderBy: [{ sectionKey: 'asc' }, { itemKey: 'asc' }] } },
    })
  }

  private toView(day: DayRecord, now: Date): RitualDayView {
    const remainingSeconds = day.runningUntil
      ? Math.max(1, Math.ceil((day.runningUntil.getTime() - now.getTime()) / 1000))
      : day.remainingSeconds
    return {
      date: day.ritualDate,
      checks: day.checks.map(({ sectionKey, itemKey, completedAt }) => ({ sectionKey, itemKey, completedAt })),
      timer: { completedCycles: day.completedCycles, remainingSeconds, runningStartedAt: day.runningStartedAt, runningUntil: day.runningUntil },
    }
  }

  private activeMembership(client: Transaction, context: CurrentTenantContext) {
    return client.tenantMembership.findFirst({
      where: { id: context.membershipId, tenantId: context.tenantId, userId: context.userId, status: 'ACTIVE', tenant: { status: 'ACTIVE' }, user: { status: 'ACTIVE' } },
      select: { tenant: { select: { timeZone: true } } },
    })
  }

  private lockMembership(tx: Transaction, membershipId: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:ritual:${membershipId}`}))`
  }

  private currentDateIn(timeZone: string, now: Date) {
    const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
    const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
    return new Date(`${value.year}-${value.month}-${value.day}T00:00:00.000Z`)
  }
}
