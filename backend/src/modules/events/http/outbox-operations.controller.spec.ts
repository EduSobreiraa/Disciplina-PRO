import { jest } from '@jest/globals'
import { OutboxOperationsController } from './outbox-operations.controller.js'
import { GetInternalEventMetricsUseCase } from '../application/process-internal-events.use-case.js'

describe('OutboxOperationsController', () => {
  it('returns operational metrics without event payloads', async () => {
    const observedAt = new Date('2026-08-22T12:05:00.000Z')
    jest.useFakeTimers().setSystemTime(observedAt)
    const metrics = {
      execute: () => Promise.resolve({
        pending: 2,
        processing: 1,
        failed: 1,
        expiredProcessing: 1,
        oldestPendingOccurredAt: new Date('2026-08-22T12:00:00.000Z'),
        maximumAttempts: 4,
      }),
    }
    const controller = new OutboxOperationsController(metrics as unknown as GetInternalEventMetricsUseCase)

    await expect(controller.getMetrics()).resolves.toEqual({
      pending: 2,
      processing: 1,
      failed: 1,
      expiredProcessing: 1,
      openDeliveries: 3,
      oldestPendingOccurredAt: new Date('2026-08-22T12:00:00.000Z'),
      oldestPendingAgeSeconds: 300,
      maximumAttempts: 4,
      observedAt,
    })
    jest.useRealTimers()
  })
})
