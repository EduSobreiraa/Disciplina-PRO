import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { ExecutionLifecycleRepository, ExecutionQueryRepository, type EnrollmentExecutionDetailView, type EnrollmentExecutionView } from '../application/execution.repository.js'
import { ExecutionAdministrativeBlocker } from '../application/execution-blocker.js'
import { ObjectiveExecutionFactsRepository, type ActivityCompletionView, type DailyRecordView } from '../application/execution-facts.repository.js'
import { ExecutionCalendar } from '../domain/execution-calendar.js'
import { ActivityNotExecutableError, EnrollmentNotCompletableError, EnrollmentNotFoundError, ExecutionBlockedError, InvalidExecutionDataError, InvalidEnrollmentTransitionError, ProgramStartNotAllowedError } from '../domain/execution.errors.js'
import type { ProgramExecutionConfiguration } from '../../programs/domain/program-policy.js'
import { INTERNAL_EVENT_TYPES, InternalEventPublisher } from '../../events/application/internal-event.contracts.js'

const executionInclude = {
  programVersion: { select: { versionNumber: true, title: true, durationDays: true, executionConfiguration: true } },
  tenantProgram: { select: { program: { select: { slug: true, name: true } } } },
  pauses: { select: { pauseStartsOn: true, resumedOn: true }, orderBy: { pausedAt: 'asc' } },
} satisfies Prisma.EnrollmentInclude

type ExecutionRecord = Prisma.EnrollmentGetPayload<{ include: typeof executionInclude }>
const executionDetailInclude = {
  ...executionInclude,
  programVersion: {
    select: {
      versionNumber: true,
      title: true,
      durationDays: true,
      executionConfiguration: true,
      activities: {
        select: {
          id: true,
          key: true,
          title: true,
          type: true,
          frequency: true,
          configuration: true,
          programPhase: { select: { key: true } },
        },
        orderBy: [{ programPhase: { position: 'asc' } }, { position: 'asc' }],
      },
    },
  },
  activityCompletions: {
    select: {
      id: true,
      activityId: true,
      programDay: true,
      programDate: true,
      occurrenceKey: true,
      completedAt: true,
    },
    orderBy: [{ programDay: 'asc' }, { completedAt: 'asc' }],
  },
  dailyRecords: {
    select: {
      id: true,
      programDay: true,
      programDate: true,
      submittedAt: true,
      pillarScores: {
        select: { pillarKey: true, score: true },
        orderBy: { pillarKey: 'asc' },
      },
    },
    orderBy: { programDay: 'asc' },
  },
} satisfies Prisma.EnrollmentInclude

type ExecutionDetailRecord = Prisma.EnrollmentGetPayload<{ include: typeof executionDetailInclude }>
type Transaction = Prisma.TransactionClient

@Injectable()
export class PrismaExecutionRepository extends ExecutionLifecycleRepository implements ExecutionQueryRepository, ExecutionAdministrativeBlocker, ObjectiveExecutionFactsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: ExecutionCalendar,
    private readonly events: InternalEventPublisher<Transaction>,
  ) { super() }

  async list(context: CurrentTenantContext, now: Date): Promise<EnrollmentExecutionView[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: this.visibleTo(context),
      include: executionInclude,
      orderBy: [{ createdAt: 'desc' }, { cycleNumber: 'desc' }],
    })
    return rows.map((row) => this.view(row, now))
  }

  async find(context: CurrentTenantContext, enrollmentId: string, now: Date): Promise<EnrollmentExecutionDetailView | null> {
    const row = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, ...this.visibleTo(context) },
      include: executionDetailInclude,
    })
    return row ? this.detailView(row, now) : null
  }

  start(context: CurrentTenantContext, enrollmentId: string, now: Date): Promise<EnrollmentExecutionView> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await this.lockOwned(tx, context, enrollmentId)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:program:${locked.programId}`}))`
      const enrollment = await this.current(tx, locked.id)
      if (enrollment.status !== 'AVAILABLE') throw new InvalidEnrollmentTransitionError()
      await this.assertEffectiveActor(tx, context)
      const startData = await tx.tenantProgram.findFirst({
        where: {
          id: enrollment.tenantProgramId,
          tenantId: context.tenantId,
          programId: enrollment.programId,
          status: 'ENABLED',
          tenant: { status: 'ACTIVE' },
          program: { status: 'ACTIVE' },
        },
        select: {
          tenant: { select: { timeZone: true } },
          program: {
            select: {
              versions: {
                where: { status: 'PUBLISHED' },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      })
      const version = startData?.program.versions[0]
      if (!startData || !version) throw new ProgramStartNotAllowedError()
      let startedOn: Date
      try { startedOn = this.calendar.today(now, startData.tenant.timeZone) } catch {
        throw new ProgramStartNotAllowedError()
      }
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'ACTIVE',
          programVersionId: version.id,
          timeZone: startData.tenant.timeZone,
          startedAt: now,
          startedOn,
        },
      })
      await this.audit(tx, context, enrollment.id, 'ENROLLMENT_STARTED', now, { programVersionId: version.id })
      return this.view(await this.current(tx, enrollment.id), now)
    })
  }

  complete(context: CurrentTenantContext, enrollmentId: string, now: Date): Promise<EnrollmentExecutionView> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await this.lockOwned(tx, context, enrollmentId)
      const enrollment = await this.current(tx, locked.id)
      if (enrollment.status === 'COMPLETED') return this.view(enrollment, now)
      if (enrollment.status !== 'ACTIVE') throw new InvalidEnrollmentTransitionError()
      await this.assertEffectiveActor(tx, context)
      const progress = this.progress(enrollment, now)
      if (!progress?.isCompletable) throw new EnrollmentNotCompletableError()
      await tx.enrollment.update({ where: { id: enrollment.id }, data: { status: 'COMPLETED', completedAt: now } })
      await this.audit(tx, context, enrollment.id, 'ENROLLMENT_COMPLETED', now, { programDay: progress.programDay })
      await this.events.publish(tx, {
        tenantId: context.tenantId,
        type: INTERNAL_EVENT_TYPES.enrollmentCompleted,
        version: 1,
        aggregateType: 'Enrollment',
        aggregateId: enrollment.id,
        sourceKey: `enrollment-completed:${enrollment.id}`,
        payload: {
          tenantId: context.tenantId,
          membershipId: context.membershipId,
          enrollmentId: enrollment.id,
          programId: enrollment.programId,
          programVersionId: enrollment.programVersionId,
          programDay: progress.programDay,
          completedAt: now.toISOString(),
        },
        occurredAt: now,
      })
      return this.view(await this.current(tx, enrollment.id), now)
    })
  }

  abandon(context: CurrentTenantContext, enrollmentId: string, reason: string, now: Date): Promise<EnrollmentExecutionView> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await this.lockOwned(tx, context, enrollmentId)
      const enrollment = await this.current(tx, locked.id)
      if (enrollment.status !== 'ACTIVE' && enrollment.status !== 'PAUSED') throw new InvalidEnrollmentTransitionError()
      await this.assertEffectiveActor(tx, context)
      if (enrollment.status === 'PAUSED') await this.closeOpenPause(tx, context, enrollment.id, now, enrollment.timeZone)
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'ABANDONED', abandonedAt: now, abandonmentReason: reason },
      })
      await this.audit(tx, context, enrollment.id, 'ENROLLMENT_ABANDONED', now, {})
      return this.view(await this.current(tx, enrollment.id), now)
    })
  }

  pause(context: CurrentTenantContext, enrollmentId: string, reason: string, now: Date): Promise<EnrollmentExecutionView> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await this.lockOwned(tx, context, enrollmentId)
      const enrollment = await this.current(tx, locked.id)
      if (enrollment.status !== 'ACTIVE' && enrollment.status !== 'PAUSED') throw new InvalidEnrollmentTransitionError()
      await this.assertEffectiveActor(tx, context)
      let pause = await tx.enrollmentPause.findFirst({ where: { enrollmentId, resumedAt: null } })
      if (!pause) {
        if (!enrollment.timeZone) throw new InvalidEnrollmentTransitionError()
        pause = await tx.enrollmentPause.create({
          data: {
            tenantId: context.tenantId,
            enrollmentId,
            pausedAt: now,
            pauseStartsOn: this.calendar.addDays(this.calendar.today(now, enrollment.timeZone), 1),
          },
        })
      }
      const existing = await tx.enrollmentPauseCause.findFirst({
        where: { enrollmentId, source: 'USER', sourceReferenceId: null, resolvedAt: null },
      })
      if (!existing) {
        await tx.enrollmentPauseCause.create({
          data: {
            tenantId: context.tenantId,
            enrollmentId,
            enrollmentPauseId: pause.id,
            source: 'USER',
            reason,
            createdAt: now,
            createdByMembershipId: context.membershipId,
          },
        })
      }
      if (enrollment.status === 'ACTIVE') await tx.enrollment.update({ where: { id: enrollmentId }, data: { status: 'PAUSED' } })
      if (!existing) await this.audit(tx, context, enrollmentId, 'ENROLLMENT_PAUSED', now, { source: 'USER' })
      return this.view(await this.current(tx, enrollmentId), now)
    })
  }

  resume(context: CurrentTenantContext, enrollmentId: string, now: Date): Promise<{ enrollment: EnrollmentExecutionView; blocked: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await this.lockOwned(tx, context, enrollmentId)
      const enrollment = await this.current(tx, locked.id)
      if (enrollment.status !== 'PAUSED' || !enrollment.timeZone) throw new InvalidEnrollmentTransitionError()
      await this.assertEffectiveActor(tx, context)
      const pause = await tx.enrollmentPause.findFirst({ where: { enrollmentId, resumedAt: null } })
      if (!pause) throw new InvalidEnrollmentTransitionError()
      const personal = await tx.enrollmentPauseCause.findFirst({
        where: { enrollmentPauseId: pause.id, source: 'USER', sourceReferenceId: null, resolvedAt: null },
      })
      if (!personal) throw new InvalidEnrollmentTransitionError()
      await tx.enrollmentPauseCause.update({
        where: { id: personal.id },
        data: { resolvedAt: now, resolvedByMembershipId: context.membershipId },
      })
      const remaining = await tx.enrollmentPauseCause.count({ where: { enrollmentPauseId: pause.id, resolvedAt: null } })
      if (remaining === 0) {
        await tx.enrollmentPause.update({
          where: { id: pause.id },
          data: { resumedAt: now, resumedOn: this.calendar.today(now, enrollment.timeZone) },
        })
        await tx.enrollment.update({ where: { id: enrollmentId }, data: { status: 'ACTIVE' } })
        await this.audit(tx, context, enrollmentId, 'ENROLLMENT_RESUMED', now, {})
      } else {
        await this.audit(tx, context, enrollmentId, 'ENROLLMENT_PERSONAL_PAUSE_RESOLVED', now, { remainingCauses: remaining })
      }
      return { enrollment: this.view(await this.current(tx, enrollmentId), now), blocked: remaining > 0 }
    })
  }

  blockMembership(tx: Transaction, input: {
    tenantId: string
    membershipId: string
    actorMembershipId?: string
    actorPlatformAccessId?: string
    reason: string
    now: Date
  }) {
    return this.blockAdministrative(tx, {
      tenantId: input.tenantId,
      membershipId: input.membershipId,
      source: 'MEMBERSHIP',
      sourceReferenceId: input.membershipId,
      actorMembershipId: input.actorMembershipId,
      actorPlatformAccessId: input.actorPlatformAccessId,
      reason: input.reason,
      now: input.now,
    })
  }

  blockTenant(tx: Transaction, input: { tenantId: string; actorPlatformAccessId: string; reason: string; now: Date }) {
    return this.blockAdministrative(tx, {
      tenantId: input.tenantId,
      source: 'TENANT',
      sourceReferenceId: input.tenantId,
      actorPlatformAccessId: input.actorPlatformAccessId,
      reason: input.reason,
      now: input.now,
    })
  }

  completeActivity(context: CurrentTenantContext, input: { enrollmentId: string; activityId: string; now: Date }): Promise<ActivityCompletionView> {
    return this.prisma.$transaction(async (tx) => {
      const enrollment = await this.activeOwned(tx, context, input.enrollmentId, input.now)
      const versionId = enrollment.programVersionId
      if (!versionId) throw new ActivityNotExecutableError()
      const activity = await tx.programActivity.findFirst({
        where: { id: input.activityId, programVersionId: versionId },
        select: { id: true, frequency: true },
      })
      if (!activity) throw new ActivityNotExecutableError()
      const progress = this.progress(enrollment, input.now)
      if (!progress) throw new ActivityNotExecutableError()
      const occurrenceKey = activity.frequency === 'ONCE'
        ? 'once'
        : activity.frequency === 'DAILY'
          ? `day:${progress.programDay}`
          : `week:${Math.ceil(progress.programDay / 7)}`
      const existing = await tx.activityCompletion.findUnique({
        where: { enrollmentId_activityId_occurrenceKey: { enrollmentId: enrollment.id, activityId: activity.id, occurrenceKey } },
      })
      if (existing) return existing
      const completion = await tx.activityCompletion.create({
        data: {
          tenantId: context.tenantId,
          enrollmentId: enrollment.id,
          programVersionId: versionId,
          activityId: activity.id,
          programDay: progress.programDay,
          programDate: progress.today,
          occurrenceKey,
          completedAt: input.now,
        },
      })
      await this.audit(tx, context, enrollment.id, 'ACTIVITY_COMPLETED', input.now, { activityId: activity.id, occurrenceKey })
      await this.events.publish(tx, {
        tenantId: context.tenantId,
        type: INTERNAL_EVENT_TYPES.activityCompletionRecorded,
        version: 1,
        aggregateType: 'ActivityCompletion',
        aggregateId: completion.id,
        sourceKey: `activity-completion:${completion.id}`,
        payload: {
          tenantId: context.tenantId,
          membershipId: context.membershipId,
          enrollmentId: enrollment.id,
          activityCompletionId: completion.id,
          activityId: activity.id,
          programDay: progress.programDay,
          programDate: progress.today.toISOString().slice(0, 10),
          occurrenceKey,
          completedAt: input.now.toISOString(),
        },
        occurredAt: input.now,
      })
      return completion
    })
  }

  recordDaily(context: CurrentTenantContext, input: { enrollmentId: string; scores: Array<{ pillarKey: string; score: number }>; now: Date }): Promise<DailyRecordView> {
    return this.prisma.$transaction(async (tx) => {
      const enrollment = await this.activeOwned(tx, context, input.enrollmentId, input.now)
      const progress = this.progress(enrollment, input.now)
      const configuration = enrollment.programVersion?.executionConfiguration as ProgramExecutionConfiguration | undefined
      const daily = configuration?.dailyRecord
      if (!progress || !daily) throw new InvalidExecutionDataError()
      const received = new Map<string, number>()
      for (const item of input.scores) {
        const key = item.pillarKey.trim().toLowerCase()
        if (received.has(key) || !Number.isInteger(item.score)) throw new InvalidExecutionDataError()
        received.set(key, item.score)
      }
      const allowed = new Map(daily.pillars.map((pillar) => [pillar.key, pillar]))
      if (daily.requireAllPillars && received.size !== allowed.size) throw new InvalidExecutionDataError()
      for (const [key, score] of received) {
        const pillar = allowed.get(key)
        if (!pillar || score < pillar.minimum || score > pillar.maximum) throw new InvalidExecutionDataError()
      }
      const existing = await tx.dailyRecord.findUnique({
        where: { enrollmentId_programDay: { enrollmentId: enrollment.id, programDay: progress.programDay } },
        include: { pillarScores: { orderBy: { pillarKey: 'asc' } } },
      })
      const normalized = [...received].sort(([left], [right]) => left.localeCompare(right))
      if (existing) {
        const stored = existing.pillarScores.map(({ pillarKey, score }) => [pillarKey, score] as const)
        if (JSON.stringify(stored) !== JSON.stringify(normalized)) throw new InvalidExecutionDataError()
        return existing
      }
      const record = await tx.dailyRecord.create({
        data: {
          tenantId: context.tenantId,
          enrollmentId: enrollment.id,
          programDay: progress.programDay,
          programDate: progress.today,
          submittedAt: input.now,
          pillarScores: {
            create: normalized.map(([pillarKey, score]) => ({ pillarKey, score })),
          },
        },
        include: { pillarScores: { orderBy: { pillarKey: 'asc' } } },
      })
      await this.audit(tx, context, enrollment.id, 'DAILY_RECORD_SUBMITTED', input.now, { dailyRecordId: record.id, programDay: progress.programDay, pillarKeys: normalized.map(([key]) => key) })
      await this.events.publish(tx, {
        tenantId: context.tenantId,
        type: INTERNAL_EVENT_TYPES.dailyRecordSubmitted,
        version: 1,
        aggregateType: 'DailyRecord',
        aggregateId: record.id,
        sourceKey: `daily-record:${record.id}`,
        payload: {
          tenantId: context.tenantId,
          membershipId: context.membershipId,
          enrollmentId: enrollment.id,
          dailyRecordId: record.id,
          programDay: progress.programDay,
          programDate: progress.today.toISOString().slice(0, 10),
          submittedAt: input.now.toISOString(),
        },
        occurredAt: input.now,
      })
      return record
    })
  }

  private async lockOwned(tx: Transaction, context: CurrentTenantContext, enrollmentId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string; programId: string }>>`
      SELECT "id", "program_id" AS "programId"
      FROM "enrollments"
      WHERE "id" = ${enrollmentId}::uuid
        AND "tenant_id" = ${context.tenantId}::uuid
        AND "membership_id" = ${context.membershipId}::uuid
      FOR UPDATE
    `
    const enrollment = rows[0]
    if (!enrollment) throw new EnrollmentNotFoundError()
    return enrollment
  }

  private visibleTo(context: CurrentTenantContext): Prisma.EnrollmentWhereInput {
    return {
      tenantId: context.tenantId,
      membershipId: context.membershipId,
      membership: {
        userId: context.userId,
        status: 'ACTIVE',
        user: { status: 'ACTIVE' },
        tenant: { status: 'ACTIVE' },
      },
    }
  }

  private current(tx: Transaction, enrollmentId: string) {
    return tx.enrollment.findUniqueOrThrow({ where: { id: enrollmentId }, include: executionInclude })
  }

  private async activeOwned(tx: Transaction, context: CurrentTenantContext, enrollmentId: string, now: Date) {
    const locked = await this.lockOwned(tx, context, enrollmentId)
    const enrollment = await this.current(tx, locked.id)
    await this.assertEffectiveActor(tx, context)
    if (enrollment.status !== 'ACTIVE') throw new ExecutionBlockedError()
    if (!this.progress(enrollment, now)) throw new ActivityNotExecutableError()
    return enrollment
  }

  private async assertEffectiveActor(tx: Transaction, context: CurrentTenantContext) {
    const membership = await tx.tenantMembership.findFirst({
      where: {
        id: context.membershipId,
        tenantId: context.tenantId,
        userId: context.userId,
        status: 'ACTIVE',
        tenant: { status: 'ACTIVE' },
        user: { status: 'ACTIVE' },
      },
      select: { id: true },
    })
    if (!membership) throw new EnrollmentNotFoundError()
  }

  private async closeOpenPause(tx: Transaction, context: CurrentTenantContext, enrollmentId: string, now: Date, timeZone: string | null) {
    if (!timeZone) throw new InvalidEnrollmentTransitionError()
    const resumedOn = this.calendar.today(now, timeZone)
    const pause = await tx.enrollmentPause.findFirst({ where: { enrollmentId, resumedAt: null }, select: { id: true } })
    if (!pause) throw new InvalidEnrollmentTransitionError()
    await tx.enrollmentPauseCause.updateMany({
      where: { enrollmentPauseId: pause.id, resolvedAt: null },
      data: { resolvedAt: now, resolvedByMembershipId: context.membershipId },
    })
    await tx.enrollmentPause.update({ where: { id: pause.id }, data: { resumedAt: now, resumedOn } })
  }

  private async blockAdministrative(tx: Transaction, input: {
    tenantId: string
    membershipId?: string
    source: 'MEMBERSHIP' | 'TENANT'
    sourceReferenceId: string
    actorMembershipId?: string
    actorPlatformAccessId?: string
    reason: string
    now: Date
  }) {
    const enrollments = await tx.enrollment.findMany({
      where: {
        tenantId: input.tenantId,
        membershipId: input.membershipId,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
      select: { id: true, status: true, timeZone: true },
      orderBy: { id: 'asc' },
    })
    let blocked = 0
    for (const candidate of enrollments) {
      await tx.$executeRaw`SELECT 1 FROM "enrollments" WHERE "id" = ${candidate.id}::uuid FOR UPDATE`
      const duplicate = await tx.enrollmentPauseCause.findFirst({
        where: {
          enrollmentId: candidate.id,
          source: input.source,
          sourceReferenceId: input.sourceReferenceId,
          resolvedAt: null,
        },
      })
      if (duplicate) continue
      if (!candidate.timeZone) throw new InvalidEnrollmentTransitionError()
      let pause = await tx.enrollmentPause.findFirst({ where: { enrollmentId: candidate.id, resumedAt: null } })
      if (!pause) {
        pause = await tx.enrollmentPause.create({
          data: {
            tenantId: input.tenantId,
            enrollmentId: candidate.id,
            pausedAt: input.now,
            pauseStartsOn: this.calendar.addDays(this.calendar.today(input.now, candidate.timeZone), 1),
          },
        })
      }
      await tx.enrollmentPauseCause.create({
        data: {
          tenantId: input.tenantId,
          enrollmentId: candidate.id,
          enrollmentPauseId: pause.id,
          source: input.source,
          sourceReferenceId: input.sourceReferenceId,
          reason: input.reason,
          createdAt: input.now,
          createdByMembershipId: input.actorMembershipId,
          createdByPlatformAccessId: input.actorPlatformAccessId,
        },
      })
      if (candidate.status === 'ACTIVE') await tx.enrollment.update({ where: { id: candidate.id }, data: { status: 'PAUSED' } })
      blocked += 1
    }
    return blocked
  }

  private progress(enrollment: ExecutionRecord, now: Date) {
    if (!enrollment.programVersion || !enrollment.startedOn || !enrollment.timeZone) return null
    return this.calendar.calculate({
      now,
      timeZone: enrollment.timeZone,
      startedOn: enrollment.startedOn,
      durationDays: enrollment.programVersion.durationDays,
      pauses: enrollment.pauses,
    })
  }

  private view(enrollment: ExecutionRecord, now: Date): EnrollmentExecutionView {
    return {
      id: enrollment.id,
      programId: enrollment.programId,
      programVersionId: enrollment.programVersionId,
      cycleNumber: enrollment.cycleNumber,
      status: enrollment.status,
      timeZone: enrollment.timeZone,
      startedAt: enrollment.startedAt,
      startedOn: enrollment.startedOn,
      completedAt: enrollment.completedAt,
      abandonedAt: enrollment.abandonedAt,
      abandonmentReason: enrollment.abandonmentReason,
      program: enrollment.tenantProgram.program,
      version: enrollment.programVersion,
      calendar: this.progress(enrollment, now),
    }
  }

  private detailView(enrollment: ExecutionDetailRecord, now: Date): EnrollmentExecutionDetailView {
    const base = this.view(enrollment, now)
    return {
      ...base,
      activities: enrollment.programVersion?.activities.map((activity) => ({
        id: activity.id,
        key: activity.key,
        title: activity.title,
        type: activity.type,
        frequency: activity.frequency,
        configuration: activity.configuration,
        phaseKey: activity.programPhase.key,
      })) ?? [],
      activityCompletions: enrollment.activityCompletions,
      dailyRecords: enrollment.dailyRecords,
    }
  }

  private audit(tx: Transaction, context: CurrentTenantContext, enrollmentId: string, action: string, now: Date, metadata: Prisma.InputJsonObject) {
    return tx.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        actorType: 'MEMBERSHIP',
        actorMembershipId: context.membershipId,
        targetMembershipId: context.membershipId,
        entityType: 'Enrollment',
        entityId: enrollmentId,
        action,
        metadata,
        occurredAt: now,
      },
    })
  }
}
