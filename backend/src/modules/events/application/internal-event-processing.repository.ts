import type { InternalEventConsumer, SupportedInternalEvent } from './internal-event-consumer.js'

export interface ClaimedInternalEventDelivery {
  id: string
  consumer: string
  attempts: number
  lockedAt: Date
  eventId: string
  tenantId: string | null
}

export interface InternalEventProcessingMetrics {
  pending: number
  processing: number
  failed: number
  expiredProcessing: number
  oldestPendingOccurredAt: Date | null
  maximumAttempts: number
}

export abstract class InternalEventProcessingRepository {
  abstract provision(consumer: string, supportedEvents: readonly SupportedInternalEvent[], now: Date): Promise<number>
  abstract claim(consumer: string, input: {
    batchSize: number
    leaseMilliseconds: number
    now: Date
  }): Promise<ClaimedInternalEventDelivery[]>
  abstract process(
    claim: ClaimedInternalEventDelivery,
    consumer: InternalEventConsumer,
    now: Date,
  ): Promise<'PROCESSED' | 'LEASE_LOST'>
  abstract reschedule(
    claim: ClaimedInternalEventDelivery,
    input: {
      now: Date
      nextAttemptAt: Date
      maximumAttempts: number
      errorCode: string
    },
  ): Promise<'PENDING' | 'FAILED' | 'LEASE_LOST'>
  abstract reprocess(deliveryId: string, now: Date): Promise<boolean>
  abstract metrics(now: Date): Promise<InternalEventProcessingMetrics>
}
