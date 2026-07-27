import { jest } from '@jest/globals'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { EnrollmentNotFoundError, ExecutionBlockedError, InvalidExecutionDataError } from '../domain/execution.errors.js'
import type { EnrollmentExecutionDetailView, EnrollmentExecutionView, ExecutionLifecycleRepository, ExecutionQueryRepository } from './execution.repository.js'
import { AbandonEnrollmentUseCase, CompleteEnrollmentUseCase, GetEnrollmentUseCase, ListEnrollmentsUseCase, PauseEnrollmentUseCase, ResumeEnrollmentUseCase, StartEnrollmentUseCase } from './execution.use-cases.js'

describe('execution use cases', () => {
  const context: CurrentTenantContext = {
    tenantId: '019f0000-0000-7000-8000-000000000001',
    membershipId: '019f0000-0000-7000-8000-000000000002',
    userId: '019f0000-0000-7000-8000-000000000003',
    tenantRole: 'USER',
  }
  const view: EnrollmentExecutionView = {
    id: 'enrollment',
    programId: 'program',
    programVersionId: null,
    cycleNumber: 1,
    status: 'AVAILABLE',
    timeZone: null,
    startedAt: null,
    startedOn: null,
    completedAt: null,
    abandonedAt: null,
    abandonmentReason: null,
    program: { slug: 'program', name: 'Program' },
    version: null,
    calendar: null,
  }
  const detailView: EnrollmentExecutionDetailView = {
    ...view,
    activities: [],
    activityCompletions: [],
    dailyRecords: [],
  }

  it('normalizes a valid abandonment reason before delegating', async () => {
    const abandon = jest.fn<ExecutionLifecycleRepository['abandon']>().mockResolvedValue(view)
    const useCase = new AbandonEnrollmentUseCase({ abandon } as unknown as ExecutionLifecycleRepository)
    await useCase.execute(context, '019f0000-0000-7000-8000-000000000004', '  decisão pessoal  ')
    expect(abandon).toHaveBeenCalledWith(context, '019f0000-0000-7000-8000-000000000004', 'decisão pessoal', expect.any(Date))
  })

  it('rejects empty and oversized abandonment reasons', () => {
    const useCase = new AbandonEnrollmentUseCase({ abandon: jest.fn() } as unknown as ExecutionLifecycleRepository)
    expect(() => useCase.execute(context, 'id', '   ')).toThrow(InvalidExecutionDataError)
    expect(() => useCase.execute(context, 'id', 'x'.repeat(501))).toThrow(InvalidExecutionDataError)
  })

  it('delegates list, start, and complete to their narrow repositories', async () => {
    const list = jest.fn<ExecutionQueryRepository['list']>().mockResolvedValue([view])
    const start = jest.fn<ExecutionLifecycleRepository['start']>().mockResolvedValue(view)
    const complete = jest.fn<ExecutionLifecycleRepository['complete']>().mockResolvedValue(view)
    const now = new Date('2026-07-25T12:00:00.000Z')
    await expect(new ListEnrollmentsUseCase({ list } as unknown as ExecutionQueryRepository).execute(context, now)).resolves.toEqual([view])
    await expect(new StartEnrollmentUseCase({ start } as unknown as ExecutionLifecycleRepository).execute(context, view.id, now)).resolves.toBe(view)
    await expect(new CompleteEnrollmentUseCase({ complete } as unknown as ExecutionLifecycleRepository).execute(context, view.id, now)).resolves.toBe(view)
    expect(list).toHaveBeenCalledWith(context, now)
    expect(start).toHaveBeenCalledWith(context, view.id, now)
    expect(complete).toHaveBeenCalledWith(context, view.id, now)
  })

  it('returns owned detail and maps absence to a domain error', async () => {
    const find = jest.fn<ExecutionQueryRepository['find']>().mockResolvedValueOnce(detailView).mockResolvedValueOnce(null)
    const useCase = new GetEnrollmentUseCase({ find } as unknown as ExecutionQueryRepository)
    await expect(useCase.execute(context, view.id)).resolves.toBe(detailView)
    await expect(useCase.execute(context, 'missing')).rejects.toBeInstanceOf(EnrollmentNotFoundError)
  })

  it('normalizes pause reasons and reports remaining administrative blocks', async () => {
    const pause = jest.fn<ExecutionLifecycleRepository['pause']>().mockResolvedValue(view)
    const resume = jest.fn<ExecutionLifecycleRepository['resume']>()
      .mockResolvedValueOnce({ enrollment: view, blocked: false })
      .mockResolvedValueOnce({ enrollment: view, blocked: true })
    await new PauseEnrollmentUseCase({ pause } as unknown as ExecutionLifecycleRepository).execute(context, view.id, '  descanso  ')
    expect(pause).toHaveBeenCalledWith(context, view.id, 'descanso', expect.any(Date))
    const useCase = new ResumeEnrollmentUseCase({ resume } as unknown as ExecutionLifecycleRepository)
    await expect(useCase.execute(context, view.id)).resolves.toBe(view)
    await expect(useCase.execute(context, view.id)).rejects.toBeInstanceOf(ExecutionBlockedError)
  })
})
