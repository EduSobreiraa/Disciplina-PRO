import { Injectable, Logger } from '@nestjs/common'
import { InternalEventConsumerRegistry, type InternalEventConsumer } from './internal-event-consumer.js'
import { InternalEventProcessingRepository, type ClaimedInternalEventDelivery } from './internal-event-processing.repository.js'

export interface ProcessInternalEventsOptions {
  batchSize?: number
  leaseMilliseconds?: number
  maximumAttempts?: number
}

const DEFAULT_BATCH_SIZE = 25
const DEFAULT_LEASE_MILLISECONDS = 30_000
const DEFAULT_MAXIMUM_ATTEMPTS = 5
const MAXIMUM_RETRY_DELAY_MILLISECONDS = 15 * 60_000

function retryDelay(attempts: number) {
  return Math.min(2 ** Math.max(0, attempts - 1) * 1_000, MAXIMUM_RETRY_DELAY_MILLISECONDS)
}

function errorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const candidate = String(error.code).trim().toUpperCase()
    if (/^[A-Z0-9_:-]{1,80}$/.test(candidate)) return candidate
  }
  return 'INTERNAL_EVENT_HANDLER_FAILED'
}

interface ProcessingOptions {
  batchSize: number
  leaseMilliseconds: number
  maximumAttempts: number
}

interface ProcessingResult {
  claimed: number
  processed: number
  retried: number
  failed: number
  leaseLost: number
}

type SuccessfulStatus = 'PROCESSED' | 'LEASE_LOST'
type FailureStatus = 'PENDING' | 'FAILED' | 'LEASE_LOST'

function processingOptions(options: ProcessInternalEventsOptions): ProcessingOptions {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
  const leaseMilliseconds = options.leaseMilliseconds ?? DEFAULT_LEASE_MILLISECONDS
  const maximumAttempts = options.maximumAttempts ?? DEFAULT_MAXIMUM_ATTEMPTS
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new Error('INTERNAL_EVENT_BATCH_INVALID')
  if (!Number.isInteger(leaseMilliseconds) || leaseMilliseconds < 1_000) throw new Error('INTERNAL_EVENT_LEASE_INVALID')
  if (!Number.isInteger(maximumAttempts) || maximumAttempts < 1 || maximumAttempts > 100) throw new Error('INTERNAL_EVENT_ATTEMPTS_INVALID')
  return { batchSize, leaseMilliseconds, maximumAttempts }
}

function deliveryContext(claim: ClaimedInternalEventDelivery) {
  return {
    eventId: claim.eventId,
    deliveryId: claim.id,
    tenantId: claim.tenantId,
    consumer: claim.consumer,
    attempts: claim.attempts,
  }
}

function accountSuccess(result: ProcessingResult, status: SuccessfulStatus) {
  if (status === 'PROCESSED') result.processed += 1
  else result.leaseLost += 1
}

function accountFailure(result: ProcessingResult, status: FailureStatus) {
  if (status === 'PENDING') result.retried += 1
  else if (status === 'FAILED') result.failed += 1
  else result.leaseLost += 1
}

@Injectable()
export class ProcessInternalEventsUseCase {
  private readonly logger = new Logger(ProcessInternalEventsUseCase.name)

  constructor(
    private readonly repository: InternalEventProcessingRepository,
    private readonly registry: InternalEventConsumerRegistry,
  ) {}

  private async reschedule(claim: ClaimedInternalEventDelivery, maximumAttempts: number, handlerErrorCode: string) {
    const failureTime = new Date()
    try {
      return await this.repository.reschedule(claim, {
        now: failureTime,
        nextAttemptAt: new Date(failureTime.getTime() + retryDelay(claim.attempts)),
        maximumAttempts,
        errorCode: handlerErrorCode,
      })
    } catch (rescheduleError) {
      this.logger.error({
        ...deliveryContext(claim),
        status: 'PROCESSING',
        errorCode: errorCode(rescheduleError),
        handlerErrorCode,
        err: rescheduleError,
      }, 'Falha ao registrar retry de evento interno')
      throw rescheduleError
    }
  }

  private async accountProcessingFailure(claim: ClaimedInternalEventDelivery, error: unknown, maximumAttempts: number, result: ProcessingResult) {
    const handlerErrorCode = errorCode(error)
    const status = await this.reschedule(claim, maximumAttempts, handlerErrorCode)
    this.logger.warn({
      ...deliveryContext(claim),
      status,
      errorCode: handlerErrorCode,
    }, 'Falha ao processar evento interno')
    accountFailure(result, status)
  }

  private async processClaim(claim: ClaimedInternalEventDelivery, consumer: InternalEventConsumer, maximumAttempts: number, result: ProcessingResult) {
    try {
      const status = await this.repository.process(claim, consumer, new Date())
      this.logger[status === 'PROCESSED' ? 'log' : 'warn']({
        ...deliveryContext(claim),
        status,
      }, 'Processamento de evento interno concluído')
      accountSuccess(result, status)
    } catch (error) {
      await this.accountProcessingFailure(claim, error, maximumAttempts, result)
    }
  }

  async execute(options: ProcessInternalEventsOptions = {}, now = new Date()) {
    const { batchSize, leaseMilliseconds, maximumAttempts } = processingOptions(options)
    const result = { claimed: 0, processed: 0, retried: 0, failed: 0, leaseLost: 0 }
    for (const consumer of this.registry.all()) {
      await this.repository.provision(consumer.name, consumer.supportedEvents, now)
      const claims = await this.repository.claim(consumer.name, { batchSize, leaseMilliseconds, now })
      result.claimed += claims.length
      for (const claim of claims) {
        await this.processClaim(claim, consumer, maximumAttempts, result)
      }
    }
    return result
  }
}

@Injectable()
export class ReprocessInternalEventDeliveryUseCase {
  constructor(private readonly repository: InternalEventProcessingRepository) {}
  execute(deliveryId: string, now = new Date()) {
    return this.repository.reprocess(deliveryId, now)
  }
}

@Injectable()
export class GetInternalEventMetricsUseCase {
  constructor(private readonly repository: InternalEventProcessingRepository) {}
  execute(now = new Date()) {
    return this.repository.metrics(now)
  }
}
