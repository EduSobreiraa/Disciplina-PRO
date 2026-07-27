import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import { InternalEventPublisher, type InternalEventDraft, type InternalEventEnvelope } from '../application/internal-event.contracts.js'
import type { InternalEventConsumer, SupportedInternalEvent } from '../application/internal-event-consumer.js'
import {
  InternalEventProcessingRepository,
  type ClaimedInternalEventDelivery,
  type InternalEventProcessingMetrics,
} from '../application/internal-event-processing.repository.js'

type Transaction = Prisma.TransactionClient

interface ClaimedRow {
  id: string
  consumer: string
  attempts: number
  lockedAt: Date
}

interface ProcessingRow {
  deliveryId: string
  attempts: number
  eventId: string
  tenantId: string | null
  type: string
  version: number
  aggregateType: string
  aggregateId: string
  sourceKey: string
  payload: Prisma.JsonValue
  occurredAt: Date
  createdAt: Date
}

function sameEvent(left: InternalEventEnvelope, right: InternalEventDraft) {
  return left.tenantId === right.tenantId
    && left.type === right.type
    && left.version === right.version
    && left.aggregateType === right.aggregateType
    && left.aggregateId === right.aggregateId
    && left.sourceKey === right.sourceKey
    && left.occurredAt.getTime() === right.occurredAt.getTime()
    && JSON.stringify(left.payload) === JSON.stringify(right.payload)
}

@Injectable()
export class PrismaInternalEventsRepository
  extends InternalEventPublisher<Transaction>
  implements InternalEventProcessingRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async publish(transaction: Transaction, event: InternalEventDraft): Promise<InternalEventEnvelope> {
    try {
      const created = await transaction.internalEvent.create({ data: event })
      return { ...created, payload: event.payload }
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002') throw error
      const existing = await transaction.internalEvent.findUniqueOrThrow({
        where: { type_sourceKey: { type: event.type, sourceKey: event.sourceKey } },
      })
      if (!sameEvent(existing as InternalEventEnvelope, event)) {
        throw new Error('INTERNAL_EVENT_SOURCE_COLLISION', { cause: error })
      }
      return existing as InternalEventEnvelope
    }
  }

  async provision(consumer: string, supportedEvents: readonly SupportedInternalEvent[], now: Date) {
    let created = 0
    for (const supported of supportedEvents) {
      created += await this.prisma.$executeRaw`
        INSERT INTO "internal_event_deliveries"
          ("internal_event_id", "consumer", "status", "attempts", "next_attempt_at", "created_at", "updated_at")
        SELECT "id", ${consumer}, 'PENDING'::"InternalEventDeliveryStatus", 0, ${now}, ${now}, ${now}
        FROM "internal_events"
        WHERE "type" = ${supported.type} AND "version" = ${supported.version}
        ON CONFLICT ("internal_event_id", "consumer") DO NOTHING
      `
    }
    return created
  }

  claim(consumer: string, input: { batchSize: number; leaseMilliseconds: number; now: Date }) {
    const lockedUntil = new Date(input.now.getTime() + input.leaseMilliseconds)
    return this.prisma.$queryRaw<ClaimedRow[]>`
      WITH candidates AS (
        SELECT "id"
        FROM "internal_event_deliveries"
        WHERE "consumer" = ${consumer}
          AND (
            ("status" = 'PENDING' AND "next_attempt_at" <= ${input.now})
            OR ("status" = 'PROCESSING' AND "locked_until" <= ${input.now})
          )
        ORDER BY "next_attempt_at" ASC, "created_at" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${input.batchSize}
      )
      UPDATE "internal_event_deliveries" AS delivery
      SET "status" = 'PROCESSING',
          "attempts" = delivery."attempts" + 1,
          "locked_at" = ${input.now},
          "locked_until" = ${lockedUntil},
          "processed_at" = NULL,
          "last_error_code" = NULL,
          "updated_at" = ${input.now}
      FROM candidates
      WHERE delivery."id" = candidates."id"
      RETURNING delivery."id", delivery."consumer", delivery."attempts", delivery."locked_at" AS "lockedAt"
    `
  }

  process(
    claim: ClaimedInternalEventDelivery,
    consumer: InternalEventConsumer,
    now: Date,
  ): Promise<'PROCESSED' | 'LEASE_LOST'> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<ProcessingRow[]>`
        SELECT
          delivery."id" AS "deliveryId",
          delivery."attempts",
          event."id" AS "eventId",
          event."tenant_id" AS "tenantId",
          event."type",
          event."version",
          event."aggregate_type" AS "aggregateType",
          event."aggregate_id" AS "aggregateId",
          event."source_key" AS "sourceKey",
          event."payload",
          event."occurred_at" AS "occurredAt",
          event."created_at" AS "createdAt"
        FROM "internal_event_deliveries" AS delivery
        JOIN "internal_events" AS event ON event."id" = delivery."internal_event_id"
        WHERE delivery."id" = ${claim.id}::uuid
          AND delivery."consumer" = ${claim.consumer}
          AND delivery."status" = 'PROCESSING'
          AND delivery."locked_at" = ${claim.lockedAt}
          AND delivery."locked_until" > ${now}
        FOR UPDATE OF delivery
      `
      const row = rows[0]
      if (!row) return 'LEASE_LOST'
      const supported = consumer.supportedEvents.some(({ type, version }) => type === row.type && version === row.version)
      if (!supported) throw Object.assign(new Error('Evento interno não suportado'), { code: 'INTERNAL_EVENT_UNSUPPORTED' })
      if (!row.payload || Array.isArray(row.payload) || typeof row.payload !== 'object') {
        throw Object.assign(new Error('Payload interno inválido'), { code: 'INTERNAL_EVENT_PAYLOAD_INVALID' })
      }
      await consumer.handle({
        id: row.eventId,
        tenantId: row.tenantId,
        type: row.type,
        version: row.version,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        sourceKey: row.sourceKey,
        payload: row.payload as Record<string, string | number | boolean | null>,
        occurredAt: row.occurredAt,
        createdAt: row.createdAt,
      }, tx)
      await tx.internalEventDelivery.update({
        where: { id: row.deliveryId },
        data: {
          status: 'PROCESSED',
          lockedAt: null,
          lockedUntil: null,
          processedAt: now,
          lastErrorCode: null,
        },
      })
      return 'PROCESSED'
    })
  }

  reschedule(
    claim: ClaimedInternalEventDelivery,
    input: { now: Date; nextAttemptAt: Date; maximumAttempts: number; errorCode: string },
  ): Promise<'PENDING' | 'FAILED' | 'LEASE_LOST'> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ attempts: number }>>`
        SELECT "attempts"
        FROM "internal_event_deliveries"
        WHERE "id" = ${claim.id}::uuid
          AND "consumer" = ${claim.consumer}
          AND "status" = 'PROCESSING'
          AND "locked_at" = ${claim.lockedAt}
        FOR UPDATE
      `
      const row = rows[0]
      if (!row) return 'LEASE_LOST'
      const failed = row.attempts >= input.maximumAttempts
      await tx.internalEventDelivery.update({
        where: { id: claim.id },
        data: failed
          ? {
              status: 'FAILED',
              lockedAt: null,
              lockedUntil: null,
              processedAt: null,
              lastErrorCode: input.errorCode,
            }
          : {
              status: 'PENDING',
              lockedAt: null,
              lockedUntil: null,
              processedAt: null,
              lastErrorCode: null,
              nextAttemptAt: input.nextAttemptAt,
            },
      })
      return failed ? 'FAILED' : 'PENDING'
    })
  }

  reprocess(deliveryId: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string
        consumer: string
        internalEventId: string
        tenantId: string | null
      }>>`
        SELECT
          delivery."id",
          delivery."consumer",
          delivery."internal_event_id" AS "internalEventId",
          event."tenant_id" AS "tenantId"
        FROM "internal_event_deliveries" AS delivery
        JOIN "internal_events" AS event ON event."id" = delivery."internal_event_id"
        WHERE delivery."id" = ${deliveryId}::uuid
          AND delivery."status" = 'FAILED'
        FOR UPDATE OF delivery
      `
      const delivery = rows[0]
      if (!delivery) return false
      await tx.internalEventDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: now,
          lockedAt: null,
          lockedUntil: null,
          processedAt: null,
          lastErrorCode: null,
        },
      })
      await tx.auditEvent.create({
        data: {
          tenantId: delivery.tenantId,
          actorType: 'SYSTEM',
          entityType: 'InternalEventDelivery',
          entityId: delivery.id,
          action: 'INTERNAL_EVENT_DELIVERY_REPROCESS_REQUESTED',
          metadata: {
            internalEventId: delivery.internalEventId,
            consumer: delivery.consumer,
          },
          occurredAt: now,
        },
      })
      return true
    })
  }

  async metrics(now: Date): Promise<InternalEventProcessingMetrics> {
    const [counts, oldest, maximum] = await Promise.all([
      this.prisma.internalEventDelivery.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.internalEvent.findFirst({
        where: {
          deliveries: {
            some: {
              OR: [
                { status: 'PENDING', nextAttemptAt: { lte: now } },
                { status: 'PROCESSING', lockedUntil: { lte: now } },
              ],
            },
          },
        },
        orderBy: { occurredAt: 'asc' },
        select: { occurredAt: true },
      }),
      this.prisma.internalEventDelivery.aggregate({ _max: { attempts: true } }),
    ])
    const count = (status: string) => counts.find((row) => row.status === status)?._count._all ?? 0
    return {
      pending: count('PENDING'),
      processing: count('PROCESSING'),
      failed: count('FAILED'),
      oldestPendingOccurredAt: oldest?.occurredAt ?? null,
      maximumAttempts: maximum._max.attempts ?? 0,
    }
  }
}
