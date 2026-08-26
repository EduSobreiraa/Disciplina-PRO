import { jest } from '@jest/globals'
import { InternalEventConsumerRegistry } from './internal-event-consumer.js'
import type { InternalEventConsumer } from './internal-event-consumer.js'
import type { ClaimedInternalEventDelivery, InternalEventProcessingRepository } from './internal-event-processing.repository.js'
import {
  GetInternalEventMetricsUseCase,
  ProcessInternalEventsUseCase,
  ReprocessInternalEventDeliveryUseCase,
} from './process-internal-events.use-case.js'

const now = new Date('2026-08-24T12:00:00.000Z')

function claim(id: string, attempts = 1): ClaimedInternalEventDelivery {
  return {
    id,
    consumer: 'audit-consumer',
    attempts,
    lockedAt: now,
    eventId: `event-${id}`,
    tenantId: 'tenant-1',
  }
}

function consumer(): InternalEventConsumer {
  return {
    name: 'audit-consumer',
    supportedEvents: [{ type: 'audit.event', version: 1 }],
    handle: () => Promise.resolve(),
  }
}

type MockedProcessingRepository = {
  [Method in keyof InternalEventProcessingRepository]: jest.MockedFunction<InternalEventProcessingRepository[Method]>
}

function repository(overrides: Partial<MockedProcessingRepository> = {}): MockedProcessingRepository {
  return {
    provision: jest.fn<InternalEventProcessingRepository['provision']>().mockResolvedValue(0),
    claim: jest.fn<InternalEventProcessingRepository['claim']>().mockResolvedValue([]),
    process: jest.fn<InternalEventProcessingRepository['process']>().mockResolvedValue('PROCESSED'),
    reschedule: jest.fn<InternalEventProcessingRepository['reschedule']>().mockResolvedValue('PENDING'),
    reprocess: jest.fn<InternalEventProcessingRepository['reprocess']>().mockResolvedValue(true),
    metrics: jest.fn<InternalEventProcessingRepository['metrics']>().mockResolvedValue({
      pending: 0,
      processing: 0,
      failed: 0,
      expiredProcessing: 0,
      oldestPendingOccurredAt: null,
      maximumAttempts: 0,
    }),
    ...overrides,
  }
}

describe('InternalEventConsumerRegistry', () => {
  it('accepts each named consumer only once', () => {
    const registry = new InternalEventConsumerRegistry()
    const registered = consumer()

    registry.register(registered)

    expect(registry.all()).toEqual([registered])
    expect(registry.get(registered.name)).toBe(registered)
    expect(() => registry.register(registered)).toThrow('INTERNAL_EVENT_CONSUMER_INVALID')
    expect(() => registry.register({ ...registered, name: '  ' })).toThrow('INTERNAL_EVENT_CONSUMER_INVALID')
  })
})

describe('ProcessInternalEventsUseCase', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('provisions consumers and accounts for processed and lost leases', async () => {
    const registry = new InternalEventConsumerRegistry()
    const registered = consumer()
    registry.register(registered)
    const store = repository({
      claim: jest.fn<InternalEventProcessingRepository['claim']>().mockResolvedValue([claim('processed'), claim('lost')]),
      process: jest
        .fn<InternalEventProcessingRepository['process']>()
        .mockResolvedValueOnce('PROCESSED')
        .mockResolvedValueOnce('LEASE_LOST'),
    })

    const result = await new ProcessInternalEventsUseCase(store, registry).execute({ batchSize: 2 }, now)

    expect(result).toEqual({ claimed: 2, processed: 1, retried: 0, failed: 0, leaseLost: 1 })
    expect(store.provision).toHaveBeenCalledWith(registered.name, registered.supportedEvents, now)
    expect(store.claim).toHaveBeenCalledWith(registered.name, { batchSize: 2, leaseMilliseconds: 30_000, now })
  })

  it('reschedules handler failures without retaining their message and accounts for every result', async () => {
    const registry = new InternalEventConsumerRegistry()
    registry.register(consumer())
    const handlerError = Object.assign(new Error('do not persist this message'), { code: 'handler_failure' })
    const store = repository({
      claim: jest.fn<InternalEventProcessingRepository['claim']>().mockResolvedValue([claim('retry'), claim('failed', 2), claim('lost')]),
      process: jest.fn<InternalEventProcessingRepository['process']>().mockImplementation(() => Promise.reject(handlerError)),
      reschedule: jest
        .fn<InternalEventProcessingRepository['reschedule']>()
        .mockResolvedValueOnce('PENDING')
        .mockResolvedValueOnce('FAILED')
        .mockResolvedValueOnce('LEASE_LOST'),
    })

    await expect(new ProcessInternalEventsUseCase(store, registry).execute({ maximumAttempts: 2 }, now)).resolves.toEqual({
      claimed: 3,
      processed: 0,
      retried: 1,
      failed: 1,
      leaseLost: 1,
    })
    expect(store.reschedule).toHaveBeenCalledTimes(3)
    expect(store.reschedule).toHaveBeenCalledWith(claim('retry'), expect.objectContaining({
      maximumAttempts: 2,
      errorCode: 'HANDLER_FAILURE',
    }))
  })

  it('surfaces a failure to persist the retry and rejects invalid worker options', async () => {
    const registry = new InternalEventConsumerRegistry()
    registry.register(consumer())
    const store = repository({
      claim: jest.fn<InternalEventProcessingRepository['claim']>().mockResolvedValue([claim('retry-error')]),
      process: jest.fn<InternalEventProcessingRepository['process']>().mockImplementation(() => Promise.reject(new Error('handler failed'))),
      reschedule: jest.fn<InternalEventProcessingRepository['reschedule']>().mockImplementation(() => Promise.reject(Object.assign(new Error('storage unavailable'), { code: 'storage_error' }))),
    })
    const useCase = new ProcessInternalEventsUseCase(store, registry)

    await expect(useCase.execute({}, now)).rejects.toThrow('storage unavailable')
    await expect(useCase.execute({ batchSize: 0 }, now)).rejects.toThrow('INTERNAL_EVENT_BATCH_INVALID')
    await expect(useCase.execute({ leaseMilliseconds: 999 }, now)).rejects.toThrow('INTERNAL_EVENT_LEASE_INVALID')
    await expect(useCase.execute({ maximumAttempts: 101 }, now)).rejects.toThrow('INTERNAL_EVENT_ATTEMPTS_INVALID')
  })
})

describe('outbox operation use cases', () => {
  it('delegates reprocessing and metrics using the supplied timestamp', async () => {
    const store = repository()
    const reprocess = new ReprocessInternalEventDeliveryUseCase(store)
    const metrics = new GetInternalEventMetricsUseCase(store)

    await expect(reprocess.execute('delivery-1', now)).resolves.toBe(true)
    await expect(metrics.execute(now)).resolves.toEqual({
      pending: 0,
      processing: 0,
      failed: 0,
      expiredProcessing: 0,
      oldestPendingOccurredAt: null,
      maximumAttempts: 0,
    })
    expect(store.reprocess).toHaveBeenCalledWith('delivery-1', now)
    expect(store.metrics).toHaveBeenCalledWith(now)
  })
})
