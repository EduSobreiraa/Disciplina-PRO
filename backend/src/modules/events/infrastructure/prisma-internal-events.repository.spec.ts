import { jest } from '@jest/globals'
import type { PrismaService } from '../../../database/prisma.service.js'
import type { ClaimedInternalEventDelivery } from '../application/internal-event-processing.repository.js'
import { PrismaInternalEventsRepository } from './prisma-internal-events.repository.js'

const now = new Date('2026-08-24T12:00:00.000Z')

function claim(): ClaimedInternalEventDelivery {
  return {
    id: 'delivery-1',
    consumer: 'consumer-1',
    attempts: 1,
    lockedAt: now,
    eventId: 'event-1',
    tenantId: 'tenant-1',
  }
}

function prismaHarness() {
  const asyncMock = () => jest.fn<(...args: unknown[]) => Promise<unknown>>()
  const transaction = {
    $queryRaw: asyncMock(),
    internalEventDelivery: { update: asyncMock() },
    auditEvent: { create: asyncMock() },
  }
  const prisma = {
    $queryRaw: asyncMock(),
    $transaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => await callback(transaction)),
    internalEventDelivery: {
      groupBy: asyncMock(),
      aggregate: asyncMock(),
      count: asyncMock(),
    },
    internalEvent: { findFirst: asyncMock() },
  }
  return { transaction, prisma, repository: new PrismaInternalEventsRepository(prisma as unknown as PrismaService) }
}

describe('PrismaInternalEventsRepository', () => {
  it('claims deliveries with the associated event and tenant identifiers', async () => {
    const { prisma, repository } = prismaHarness()
    const claimed = [{ ...claim(), attempts: 2 }]
    prisma.$queryRaw.mockResolvedValue(claimed)

    await expect(repository.claim('consumer-1', { batchSize: 3, leaseMilliseconds: 30_000, now })).resolves.toEqual(claimed)

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it('processes a supported event, but never processes a lost lease', async () => {
    const { transaction, repository } = prismaHarness()
    const supportedConsumer = {
      name: 'consumer-1',
      supportedEvents: [{ type: 'audit.event', version: 1 }],
      handle: jest.fn(() => Promise.resolve()),
    }
    transaction.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        deliveryId: 'delivery-1',
        attempts: 1,
        eventId: 'event-1',
        tenantId: 'tenant-1',
        type: 'audit.event',
        version: 1,
        aggregateType: 'Audit',
        aggregateId: 'aggregate-1',
        sourceKey: 'source-1',
        payload: { accepted: true },
        occurredAt: now,
        createdAt: now,
      }])

    await expect(repository.process(claim(), supportedConsumer, now)).resolves.toBe('LEASE_LOST')
    await expect(repository.process(claim(), supportedConsumer, now)).resolves.toBe('PROCESSED')
    expect(supportedConsumer.handle).toHaveBeenCalledWith(expect.objectContaining({
      id: 'event-1',
      tenantId: 'tenant-1',
      payload: { accepted: true },
    }), transaction)
    expect(transaction.internalEventDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matcher.
      data: expect.objectContaining({ status: 'PROCESSED', processedAt: now }),
    }))
  })

  it('rejects unsupported or invalid events before calling a consumer', async () => {
    const { transaction, repository } = prismaHarness()
    const consumer = {
      name: 'consumer-1',
      supportedEvents: [],
      handle: jest.fn(() => Promise.resolve()),
    }
    const event = {
      deliveryId: 'delivery-1',
      attempts: 1,
      eventId: 'event-1',
      tenantId: 'tenant-1',
      type: 'audit.event',
      version: 1,
      aggregateType: 'Audit',
      aggregateId: 'aggregate-1',
      sourceKey: 'source-1',
      payload: { accepted: true },
      occurredAt: now,
      createdAt: now,
    }
    transaction.$queryRaw.mockResolvedValueOnce([event]).mockResolvedValueOnce([{ ...event, payload: null }])

    await expect(repository.process(claim(), consumer, now)).rejects.toMatchObject({ code: 'INTERNAL_EVENT_UNSUPPORTED' })
    await expect(repository.process(claim(), { ...consumer, supportedEvents: [{ type: 'audit.event', version: 1 }] }, now)).rejects.toMatchObject({ code: 'INTERNAL_EVENT_PAYLOAD_INVALID' })
    expect(consumer.handle).not.toHaveBeenCalled()
  })

  it('reschedules pending, failed and missing deliveries without changing the event', async () => {
    const { transaction, repository } = prismaHarness()
    transaction.$queryRaw
      .mockResolvedValueOnce([{ attempts: 1 }])
      .mockResolvedValueOnce([{ attempts: 2 }])
      .mockResolvedValueOnce([])
    const input = { now, nextAttemptAt: new Date(now.getTime() + 1_000), maximumAttempts: 2, errorCode: 'HANDLER_FAILED' }

    await expect(repository.reschedule(claim(), input)).resolves.toBe('PENDING')
    await expect(repository.reschedule(claim(), input)).resolves.toBe('FAILED')
    await expect(repository.reschedule(claim(), input)).resolves.toBe('LEASE_LOST')
    expect(transaction.internalEventDelivery.update).toHaveBeenNthCalledWith(1, expect.objectContaining({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matcher.
      data: expect.objectContaining({ status: 'PENDING', nextAttemptAt: input.nextAttemptAt }),
    }))
    expect(transaction.internalEventDelivery.update).toHaveBeenNthCalledWith(2, expect.objectContaining({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matcher.
      data: expect.objectContaining({ status: 'FAILED', lastErrorCode: input.errorCode }),
    }))
  })

  it('reprocesses only failed deliveries and records the operational audit event', async () => {
    const { transaction, repository } = prismaHarness()
    transaction.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'delivery-1',
        consumer: 'consumer-1',
        internalEventId: 'event-1',
        tenantId: 'tenant-1',
      }])

    await expect(repository.reprocess('missing', now)).resolves.toBe(false)
    await expect(repository.reprocess('delivery-1', now)).resolves.toBe(true)
    expect(transaction.internalEventDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'delivery-1' },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matcher.
      data: expect.objectContaining({ status: 'PENDING', attempts: 0, nextAttemptAt: now }),
    }))
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matcher.
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        entityId: 'delivery-1',
        action: 'INTERNAL_EVENT_DELIVERY_REPROCESS_REQUESTED',
      }),
    })
  })

  it('reports counts, expired processing and the oldest pending event', async () => {
    const { prisma, repository } = prismaHarness()
    prisma.internalEventDelivery.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { _all: 2 } },
      { status: 'PROCESSING', _count: { _all: 1 } },
    ])
    prisma.internalEvent.findFirst.mockResolvedValue({ occurredAt: now })
    prisma.internalEventDelivery.aggregate.mockResolvedValue({ _max: { attempts: 4 } })
    prisma.internalEventDelivery.count.mockResolvedValue(1)

    await expect(repository.metrics(now)).resolves.toEqual({
      pending: 2,
      processing: 1,
      failed: 0,
      expiredProcessing: 1,
      oldestPendingOccurredAt: now,
      maximumAttempts: 4,
    })
    expect(prisma.internalEventDelivery.count).toHaveBeenCalledWith({
      where: { status: 'PROCESSING', lockedUntil: { lte: now } },
    })
  })
})
