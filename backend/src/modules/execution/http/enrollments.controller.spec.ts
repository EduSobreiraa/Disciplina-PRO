import { jest } from '@jest/globals'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import type { AbandonEnrollmentUseCase, CompleteEnrollmentUseCase, GetEnrollmentUseCase, ListEnrollmentsUseCase, PauseEnrollmentUseCase, ResumeEnrollmentUseCase, StartEnrollmentUseCase } from '../application/execution.use-cases.js'
import type { CompleteActivityUseCase, RecordDailyUseCase } from '../application/execution-facts.use-cases.js'
import { EnrollmentNotFoundError, ExecutionBlockedError } from '../domain/execution.errors.js'
import { EnrollmentsController } from './enrollments.controller.js'

describe('EnrollmentsController', () => {
  const context: CurrentTenantContext = {
    tenantId: '019f0000-0000-7000-8000-000000000001',
    membershipId: '019f0000-0000-7000-8000-000000000002',
    userId: '019f0000-0000-7000-8000-000000000003',
    tenantRole: 'USER',
  }

  function setup() {
    const list = { execute: jest.fn<() => Promise<unknown>>().mockResolvedValue([]) }
    const detail = { execute: jest.fn<() => Promise<unknown>>().mockRejectedValue(new EnrollmentNotFoundError()) }
    const start = { execute: jest.fn<() => Promise<unknown>>().mockResolvedValue({ status: 'ACTIVE' }) }
    const complete = { execute: jest.fn<() => Promise<unknown>>().mockResolvedValue({ status: 'COMPLETED' }) }
    const abandon = { execute: jest.fn<() => Promise<unknown>>().mockResolvedValue({ status: 'ABANDONED' }) }
    const pause = { execute: jest.fn<() => Promise<unknown>>().mockResolvedValue({ status: 'PAUSED' }) }
    const resume = { execute: jest.fn<() => Promise<unknown>>().mockRejectedValue(new ExecutionBlockedError()) }
    const activity = { execute: jest.fn<() => Promise<unknown>>().mockResolvedValue({ occurrenceKey: 'day:1' }) }
    const daily = { execute: jest.fn<() => Promise<unknown>>().mockResolvedValue({ programDay: 1 }) }
    return new EnrollmentsController(
      list as unknown as ListEnrollmentsUseCase,
      detail as unknown as GetEnrollmentUseCase,
      start as unknown as StartEnrollmentUseCase,
      complete as unknown as CompleteEnrollmentUseCase,
      abandon as unknown as AbandonEnrollmentUseCase,
      pause as unknown as PauseEnrollmentUseCase,
      resume as unknown as ResumeEnrollmentUseCase,
      activity as unknown as CompleteActivityUseCase,
      daily as unknown as RecordDailyUseCase,
    )
  }

  it('delegates lifecycle routes and maps stable errors', async () => {
    const controller = setup()
    await expect(controller.list(context)).resolves.toEqual([])
    await expect(controller.start(context, 'enrollment')).resolves.toEqual({ status: 'ACTIVE' })
    await expect(controller.pause(context, 'enrollment', { reason: 'Pausa' })).resolves.toEqual({ status: 'PAUSED' })
    await expect(controller.complete(context, 'enrollment')).resolves.toEqual({ status: 'COMPLETED' })
    await expect(controller.abandon(context, 'enrollment', { reason: 'Fim' })).resolves.toEqual({ status: 'ABANDONED' })
    await expect(controller.activityCompletion(context, 'enrollment', 'activity')).resolves.toEqual({ occurrenceKey: 'day:1' })
    await expect(controller.dailyRecord(context, 'enrollment', { scores: [{ pillarKey: 'disciplina', score: 8 }] })).resolves.toEqual({ programDay: 1 })
    await expect(controller.detail(context, 'missing')).rejects.toMatchObject({ response: { code: 'RESOURCE_NOT_FOUND' } })
    await expect(controller.resume(context, 'enrollment')).rejects.toMatchObject({ response: { code: 'EXECUTION_BLOCKED' } })
  })
})
