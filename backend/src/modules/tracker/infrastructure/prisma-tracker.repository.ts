import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma, type TrackerMarkStatus } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { DEFAULT_TRACKER_BEHAVIORS } from '../domain/tracker-defaults.js'
import { normalizeBehaviorName } from '../domain/tracker-policy.js'
import {
  TrackerRepository,
  type ChangeBehaviorResult,
  type ChangeJustificationResult,
  type ChangeMarkResult,
  type CreateBehaviorResult,
  type TrackerStateView,
  type TrackerBackupData,
  type RestoreTrackerResult,
} from '../application/tracker.repository.js'

type Transaction = Prisma.TransactionClient

@Injectable()
export class PrismaTrackerRepository extends TrackerRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  async findMine(context: CurrentTenantContext, range: { from: Date; to: Date }): Promise<TrackerStateView | null> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockMembership(tx, context.membershipId)
      if (!await this.activeMembership(tx, context)) return null
      const scope = { tenantId: context.tenantId, membershipId: context.membershipId }
      await this.ensureBehaviors(tx, scope)
      const [behaviors, marks] = await Promise.all([
        tx.trackerBehavior.findMany({
        where: scope,
        orderBy: { position: 'asc' },
        select: { id: true, name: true, position: true, active: true },
      }),
        tx.trackerMark.findMany({
        where: { ...scope, trackedOn: { gte: range.from, lte: range.to } },
        orderBy: [{ trackedOn: 'asc' }, { behavior: { position: 'asc' } }],
        select: { id: true, behaviorId: true, trackedOn: true, status: true, justification: { select: { text: true } } },
      }),
      ])
      return { behaviors, marks: marks.map(({ justification, ...mark }) => ({ ...mark, justification: justification?.text ?? null })) }
    })
  }

  async exportBackup(context: CurrentTenantContext): Promise<TrackerBackupData | null> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockMembership(tx, context.membershipId)
      if (!await this.activeMembership(tx, context)) return null
      const scope = { tenantId: context.tenantId, membershipId: context.membershipId }
      await this.ensureBehaviors(tx, scope)
      const [behaviors, marks] = await Promise.all([
        tx.trackerBehavior.findMany({ where: scope, orderBy: { position: 'asc' }, select: { id: true, name: true, position: true, active: true } }),
        tx.trackerMark.findMany({
          where: scope,
          orderBy: [{ trackedOn: 'asc' }, { behavior: { position: 'asc' } }],
          select: { behaviorId: true, trackedOn: true, status: true, justification: { select: { text: true } } },
        }),
      ])
      return {
        behaviors: behaviors.map(({ id, ...behavior }) => ({ key: id, ...behavior })),
        marks: marks.map(({ behaviorId, justification, ...mark }) => ({ behaviorKey: behaviorId, ...mark, justification: justification?.text ?? null })),
      }
    })
  }

  async restoreBackup(context: CurrentTenantContext, data: TrackerBackupData): Promise<RestoreTrackerResult> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockMembership(tx, context.membershipId)
      const membership = await this.activeMembership(tx, context)
      if (!membership) return 'context-not-found'
      const currentDate = this.currentDateIn(membership.tenant.timeZone)
      if (data.marks.some((mark) => mark.trackedOn > currentDate)) return 'future-date'

      const scope = { tenantId: context.tenantId, membershipId: context.membershipId }
      await tx.trackerJustification.deleteMany({ where: scope })
      await tx.trackerMark.deleteMany({ where: scope })
      await tx.trackerBehavior.deleteMany({ where: scope })

      const behaviorIds = new Map(data.behaviors.map((behavior) => [behavior.key, randomUUID()]))
      if (data.behaviors.length) await tx.trackerBehavior.createMany({
        data: data.behaviors.map((behavior) => ({
          id: behaviorIds.get(behavior.key)!,
          ...scope,
          name: behavior.name,
          normalizedName: normalizeBehaviorName(behavior.name),
          position: behavior.position,
          active: behavior.active,
          archivedAt: behavior.active ? null : new Date(),
        })),
      })
      const marks = data.marks.map((mark) => ({ ...mark, id: randomUUID() }))
      if (marks.length) await tx.trackerMark.createMany({
        data: marks.map((mark) => ({
          ...scope,
          id: mark.id,
          behaviorId: behaviorIds.get(mark.behaviorKey)!,
          trackedOn: mark.trackedOn,
          status: mark.status,
        })),
      })
      const justifications = marks.filter((mark) => mark.justification).map((mark) => ({
        ...scope,
        trackerMarkId: mark.id,
        text: mark.justification!,
      }))
      if (justifications.length) await tx.trackerJustification.createMany({ data: justifications })
      return 'restored'
    })
  }

  createBehavior(context: CurrentTenantContext, input: { name: string; normalizedName: string }): Promise<CreateBehaviorResult> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockMembership(tx, context.membershipId)
      if (!await this.activeMembership(tx, context)) return { kind: 'context-not-found' }
      const scope = { tenantId: context.tenantId, membershipId: context.membershipId }
      if (await tx.trackerBehavior.count({ where: { ...scope, active: true } }) >= 20) return { kind: 'limit' }
      if (await tx.trackerBehavior.findFirst({ where: { ...scope, normalizedName: input.normalizedName, active: true }, select: { id: true } })) return { kind: 'duplicate' }
      const position = ((await tx.trackerBehavior.aggregate({ where: scope, _max: { position: true } }))._max.position ?? -1) + 1
      const behavior = await tx.trackerBehavior.create({ data: { ...scope, ...input, position }, select: { id: true, name: true, position: true, active: true } })
      return { kind: 'created', behavior }
    })
  }

  renameBehavior(context: CurrentTenantContext, behaviorId: string, input: { name: string; normalizedName: string }): Promise<ChangeBehaviorResult> {
    return this.prisma.$transaction(async (tx) => {
      if (!await this.activeMembership(tx, context)) return 'context-not-found'
      const scope = { tenantId: context.tenantId, membershipId: context.membershipId }
      if (!await tx.trackerBehavior.findFirst({ where: { id: behaviorId, ...scope, active: true }, select: { id: true } })) return 'not-found'
      if (await tx.trackerBehavior.findFirst({ where: { ...scope, normalizedName: input.normalizedName, active: true, id: { not: behaviorId } }, select: { id: true } })) return 'duplicate'
      await tx.trackerBehavior.update({ where: { id: behaviorId }, data: input })
      return 'changed'
    })
  }

  archiveBehavior(context: CurrentTenantContext, behaviorId: string): Promise<ChangeBehaviorResult> {
    return this.prisma.$transaction(async (tx) => {
      if (!await this.activeMembership(tx, context)) return 'context-not-found'
      const result = await tx.trackerBehavior.updateMany({
        where: { id: behaviorId, tenantId: context.tenantId, membershipId: context.membershipId, active: true },
        data: { active: false, archivedAt: new Date() },
      })
      return result.count === 1 ? 'changed' : 'not-found'
    })
  }

  putMark(context: CurrentTenantContext, behaviorId: string, trackedOn: Date, status: TrackerMarkStatus): Promise<ChangeMarkResult> {
    return this.prisma.$transaction(async (tx) => {
      const membership = await this.activeMembership(tx, context)
      if (!membership) return 'context-not-found'
      if (trackedOn > this.currentDateIn(membership.tenant.timeZone)) return 'future-date'
      const scope = { tenantId: context.tenantId, membershipId: context.membershipId }
      if (!await tx.trackerBehavior.findFirst({ where: { id: behaviorId, ...scope, active: true }, select: { id: true } })) return 'behavior-not-found'
      const mark = await tx.trackerMark.upsert({
        where: { behaviorId_trackedOn: { behaviorId, trackedOn } },
        create: { ...scope, behaviorId, trackedOn, status },
        update: { status },
        select: { id: true },
      })
      if (status === 'COMPLETED') await tx.trackerJustification.deleteMany({ where: { trackerMarkId: mark.id, ...scope } })
      return 'changed'
    })
  }

  deleteMark(context: CurrentTenantContext, behaviorId: string, trackedOn: Date): Promise<ChangeMarkResult> {
    return this.prisma.$transaction(async (tx) => {
      if (!await this.activeMembership(tx, context)) return 'context-not-found'
      const scope = { tenantId: context.tenantId, membershipId: context.membershipId }
      if (!await tx.trackerBehavior.findFirst({ where: { id: behaviorId, ...scope }, select: { id: true } })) return 'behavior-not-found'
      const mark = await tx.trackerMark.findFirst({ where: { behaviorId, trackedOn, ...scope }, select: { id: true } })
      if (!mark) return 'mark-not-found'
      await tx.trackerJustification.deleteMany({ where: { trackerMarkId: mark.id, ...scope } })
      await tx.trackerMark.delete({ where: { id: mark.id } })
      return 'changed'
    })
  }

  putJustification(context: CurrentTenantContext, behaviorId: string, trackedOn: Date, text: string): Promise<ChangeJustificationResult> {
    return this.prisma.$transaction(async (tx) => {
      if (!await this.activeMembership(tx, context)) return 'context-not-found'
      const scope = { tenantId: context.tenantId, membershipId: context.membershipId }
      const mark = await tx.trackerMark.findFirst({ where: { behaviorId, trackedOn, ...scope }, select: { id: true, status: true } })
      if (!mark) return 'mark-not-found'
      if (mark.status !== 'FAILED') return 'not-failed'
      await tx.trackerJustification.upsert({
        where: { trackerMarkId_tenantId_membershipId: { trackerMarkId: mark.id, ...scope } },
        create: { trackerMarkId: mark.id, ...scope, text },
        update: { text },
      })
      return 'changed'
    })
  }

  private activeMembership(client: Transaction | PrismaService, context: CurrentTenantContext) {
    return client.tenantMembership.findFirst({
      where: { id: context.membershipId, tenantId: context.tenantId, userId: context.userId, status: 'ACTIVE', tenant: { status: 'ACTIVE' }, user: { status: 'ACTIVE' } },
      select: { id: true, tenant: { select: { timeZone: true } } },
    })
  }

  private async ensureBehaviors(tx: Transaction, scope: { tenantId: string; membershipId: string }) {
    if (await tx.trackerBehavior.count({ where: scope }) > 0) return
    await tx.trackerBehavior.createMany({
      data: DEFAULT_TRACKER_BEHAVIORS.map((name, position) => ({ ...scope, name, normalizedName: normalizeBehaviorName(name), position })),
    })
  }

  private lockMembership(tx: Transaction, membershipId: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:tracker:${membershipId}`}))`
  }

  private currentDateIn(timeZone: string) {
    const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date())
    const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
    return new Date(`${value.year}-${value.month}-${value.day}T00:00:00.000Z`)
  }
}
