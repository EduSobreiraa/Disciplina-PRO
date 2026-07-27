import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { PrivateExecutionResponseRepository, type PrivateResponseView } from '../application/execution-facts.repository.js'
import { ExecutionCalendar } from '../domain/execution-calendar.js'
import { ActivityNotExecutableError, EnrollmentNotFoundError, ExecutionBlockedError, InvalidExecutionDataError } from '../domain/execution.errors.js'

type Transaction = Prisma.TransactionClient

@Injectable()
export class PrismaPrivateExecutionResponseRepository extends PrivateExecutionResponseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: ExecutionCalendar,
  ) { super() }

  put(context: CurrentTenantContext, input: { enrollmentId: string; activityId: string; payload: Record<string, unknown>; now: Date }): Promise<PrivateResponseView> {
    return this.prisma.$transaction(async (tx) => {
      const enrollment = await this.lockAndLoad(tx, context, input.enrollmentId)
      if (enrollment.status !== 'ACTIVE') throw new ExecutionBlockedError()
      const progress = this.progress(enrollment, input.now)
      if (!progress || !enrollment.programVersionId) throw new ActivityNotExecutableError()
      const activity = await tx.programActivity.findFirst({
        where: { id: input.activityId, programVersionId: enrollment.programVersionId },
        select: { id: true, frequency: true, configuration: true },
      })
      const configuration = activity?.configuration as { privateResponse?: { enabled?: unknown; maximumPayloadBytes?: unknown } } | undefined
      const policy = configuration?.privateResponse
      if (!activity || policy?.enabled !== true || !Number.isInteger(policy.maximumPayloadBytes)) throw new ActivityNotExecutableError()
      let serialized: string
      try { serialized = JSON.stringify(input.payload) } catch { throw new InvalidExecutionDataError() }
      if (Buffer.byteLength(serialized, 'utf8') > Number(policy.maximumPayloadBytes)) throw new InvalidExecutionDataError()
      const occurrence = activity.frequency === 'ONCE'
        ? { programDay: 1, programDate: enrollment.startedOn as Date }
        : { programDay: progress.programDay, programDate: progress.today }
      const existing = await tx.privateActivityResponse.findUnique({
        where: { enrollmentId_activityId_programDay: { enrollmentId: enrollment.id, activityId: activity.id, programDay: occurrence.programDay } },
        select: { id: true },
      })
      const response = await tx.privateActivityResponse.upsert({
        where: { enrollmentId_activityId_programDay: { enrollmentId: enrollment.id, activityId: activity.id, programDay: occurrence.programDay } },
        create: {
          tenantId: context.tenantId,
          enrollmentId: enrollment.id,
          programVersionId: enrollment.programVersionId,
          activityId: activity.id,
          programDay: occurrence.programDay,
          programDate: occurrence.programDate,
          payload: input.payload as Prisma.InputJsonObject,
          submittedAt: input.now,
          updatedAt: input.now,
        },
        update: { payload: input.payload as Prisma.InputJsonObject, updatedAt: input.now },
      })
      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          actorType: 'MEMBERSHIP',
          actorMembershipId: context.membershipId,
          targetMembershipId: context.membershipId,
          entityType: 'PrivateActivityResponse',
          entityId: response.id,
          action: existing ? 'PRIVATE_RESPONSE_REPLACED' : 'PRIVATE_RESPONSE_CREATED',
          metadata: { enrollmentId: enrollment.id, activityId: activity.id, programDay: occurrence.programDay },
          occurredAt: input.now,
        },
      })
      return this.view(response)
    })
  }

  async get(context: CurrentTenantContext, input: { enrollmentId: string; activityId: string; now: Date }): Promise<PrivateResponseView | null> {
    return this.prisma.$transaction(async (tx) => {
      const enrollment = await this.lockAndLoad(tx, context, input.enrollmentId, false)
      const progress = this.progress(enrollment, input.now)
      if (!progress || !enrollment.programVersionId) return null
      const activity = await tx.programActivity.findFirst({
        where: { id: input.activityId, programVersionId: enrollment.programVersionId },
        select: { frequency: true },
      })
      if (!activity) return null
      const programDay = activity.frequency === 'ONCE' ? 1 : progress.programDay
      const response = await tx.privateActivityResponse.findUnique({
        where: { enrollmentId_activityId_programDay: { enrollmentId: enrollment.id, activityId: input.activityId, programDay } },
      })
      return response ? this.view(response) : null
    })
  }

  private async lockAndLoad(tx: Transaction, context: CurrentTenantContext, enrollmentId: string, lock = true) {
    if (lock) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT e.id FROM enrollments e
        WHERE e.id = ${enrollmentId}::uuid AND e.tenant_id = ${context.tenantId}::uuid
          AND e.membership_id = ${context.membershipId}::uuid
        FOR UPDATE
      `
      if (!rows[0]) throw new EnrollmentNotFoundError()
    }
    const enrollment = await tx.enrollment.findFirst({
      where: {
        id: enrollmentId,
        tenantId: context.tenantId,
        membershipId: context.membershipId,
        membership: {
          userId: context.userId,
          status: 'ACTIVE',
          user: { status: 'ACTIVE' },
          tenant: { status: 'ACTIVE' },
        },
      },
      include: {
        programVersion: { select: { durationDays: true } },
        pauses: { select: { pauseStartsOn: true, resumedOn: true }, orderBy: { pausedAt: 'asc' } },
      },
    })
    if (!enrollment) throw new EnrollmentNotFoundError()
    return enrollment
  }

  private progress(enrollment: Awaited<ReturnType<PrismaPrivateExecutionResponseRepository['lockAndLoad']>>, now: Date) {
    if (!enrollment.startedOn || !enrollment.timeZone || !enrollment.programVersion) return null
    return this.calendar.calculate({
      now,
      timeZone: enrollment.timeZone,
      startedOn: enrollment.startedOn,
      durationDays: enrollment.programVersion.durationDays,
      pauses: enrollment.pauses,
    })
  }

  private view(response: {
    id: string
    activityId: string
    programDay: number
    programDate: Date
    payload: Prisma.JsonValue
    submittedAt: Date
    updatedAt: Date
  }): PrivateResponseView {
    return {
      ...response,
      payload: response.payload as Record<string, unknown>,
    }
  }
}
