import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROJETO66_PROGRAM_SLUG } from './data/projeto66-contract'
import { Projeto66Provider } from './Projeto66Provider'
import { useProjeto66Context } from './projeto66-context'
import { Projeto66ApiError } from './repositories/projeto66.http.repository'

const mocks = vi.hoisted(() => ({
  session: null,
  repository: {
    listEnrollments: vi.fn(),
    loadCycle: vi.fn(),
    startCycle: vi.fn(),
    saveDailyRecord: vi.fn(),
    completeActivity: vi.fn(),
    loadPrivateResponse: vi.fn(),
    savePrivateResponse: vi.fn(),
  },
}))

vi.mock('../../app/providers/app-context', () => ({ useAppContext: () => mocks.session }))
vi.mock('./repositories/projeto66.http.repository', () => {
  class Projeto66ApiError extends Error {
    constructor(status, code, message) {
      super(message)
      this.name = 'Projeto66ApiError'
      this.status = status
      this.code = code
    }
  }
  return {
    Projeto66ApiError,
    createProjeto66HttpRepository: () => ({ ...mocks.repository }),
  }
})

const enrollment = { id: 'enrollment-1', program: { slug: PROJETO66_PROGRAM_SLUG } }

function session(tenantId = 'tenant-1') {
  return {
    tenant: tenantId ? { id: tenantId } : null,
    sessionClient: {
      getAccessToken: vi.fn(() => 'access-token'),
      authorizedFetch: vi.fn(),
    },
  }
}

function cycle(id = 'cycle-1', overrides = {}) {
  return {
    id,
    status: 'AVAILABLE',
    currentDay: 1,
    completedDays: [],
    dailyRecords: {},
    checklistByDay: { 1: { already: true } },
    activities: {
      mission: { id: 'activity-mission' },
      already: { id: 'activity-already' },
      private: { id: 'activity-private' },
    },
    ...overrides,
  }
}

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

function wrapper({ children }) {
  return <Projeto66Provider>{children}</Projeto66Provider>
}

describe('Projeto66Provider', () => {
  beforeEach(() => {
    for (const operation of Object.values(mocks.repository)) operation.mockReset()
    mocks.session = session()
    mocks.repository.listEnrollments.mockResolvedValue([enrollment])
    mocks.repository.loadCycle.mockResolvedValue(cycle())
    mocks.repository.startCycle.mockResolvedValue(cycle('cycle-1', { status: 'ACTIVE' }))
    mocks.repository.saveDailyRecord.mockResolvedValue(cycle('cycle-1', { status: 'ACTIVE' }))
    mocks.repository.completeActivity.mockResolvedValue(cycle('cycle-1', { status: 'ACTIVE', checklistByDay: { 1: { already: true, mission: true } } }))
    mocks.repository.loadPrivateResponse.mockResolvedValue({ payload: { note: 'Privado' } })
    mocks.repository.savePrivateResponse.mockResolvedValue({ saved: true })
  })

  it('loads and reloads the enabled Projeto 66 enrollment', async () => {
    const { result } = renderHook(() => useProjeto66Context(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.cycle.id).toBe('cycle-1')
    expect(mocks.repository.loadCycle).toHaveBeenCalledWith('enrollment-1')

    await act(async () => { await expect(result.current.reload()).resolves.toMatchObject({ id: 'cycle-1' }) })
    expect(mocks.repository.listEnrollments).toHaveBeenCalledTimes(2)
  })

  it('reports when Projeto 66 is not enabled and preserves reload rejection', async () => {
    mocks.repository.listEnrollments.mockResolvedValue([])
    const { result } = renderHook(() => useProjeto66Context(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error.message).toContain('não está habilitado')
    await act(async () => { await expect(result.current.reload()).rejects.toThrow('não está habilitado') })
  })

  it('starts the cycle, records pillars, and completes only pending activities', async () => {
    const { result } = renderHook(() => useProjeto66Context(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => { await result.current.startCycle() })
    expect(mocks.repository.startCycle).toHaveBeenCalledWith('cycle-1')
    expect(result.current.cycle.status).toBe('ACTIVE')

    const pillars = { health: 4, work: 5 }
    await act(async () => { await result.current.saveDailyRecord(1, { pillars }) })
    expect(mocks.repository.saveDailyRecord).toHaveBeenCalledWith('cycle-1', pillars)

    await act(async () => { await result.current.saveChecklist(1, { mission: true, already: true, ignored: false }) })
    expect(mocks.repository.completeActivity).toHaveBeenCalledOnce()
    expect(mocks.repository.completeActivity).toHaveBeenCalledWith('cycle-1', 'activity-mission')

    await expect(result.current.saveChecklist(1, { unpublished: true })).rejects.toThrow('Atividade unpublished não publicada')
  })

  it('loads and saves private responses while treating only 404 as absence', async () => {
    const { result } = renderHook(() => useProjeto66Context(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await expect(result.current.loadPrivateResponse('private')).resolves.toEqual({ note: 'Privado' })
    expect(mocks.repository.loadPrivateResponse).toHaveBeenCalledWith('cycle-1', 'activity-private')

    mocks.repository.loadPrivateResponse.mockRejectedValueOnce(new Projeto66ApiError(404, 'PRIVATE_RESPONSE_NOT_FOUND', 'ausente'))
    await expect(result.current.loadPrivateResponse('private')).resolves.toBeNull()
    const serverFailure = new Projeto66ApiError(503, 'REQUEST_FAILED', 'indisponível')
    mocks.repository.loadPrivateResponse.mockRejectedValueOnce(serverFailure)
    await expect(result.current.loadPrivateResponse('private')).rejects.toBe(serverFailure)

    await expect(result.current.savePrivateResponse('private', { note: 'Novo valor' })).resolves.toEqual({ saved: true })
    expect(mocks.repository.savePrivateResponse).toHaveBeenCalledWith('cycle-1', 'activity-private', { note: 'Novo valor' })
    await expect(result.current.loadPrivateResponse('missing')).rejects.toThrow('Atividade privada missing não publicada')
    await expect(result.current.savePrivateResponse('missing', {})).rejects.toThrow('Atividade privada missing não publicada')
  })

  it('exposes a repository failure when there is no usable tenant context', async () => {
    const failure = new Projeto66ApiError(0, 'SESSION_CONTEXT_REQUIRED', 'Sessão empresarial indisponível')
    mocks.session = session(null)
    mocks.repository.listEnrollments.mockRejectedValueOnce(failure)
    const { result } = renderHook(() => useProjeto66Context(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(failure)
  })

  it('ignores an enrollment load completed after the selected tenant changes', async () => {
    const oldTenantLoad = deferred()
    const tenantTwoCycle = cycle('cycle-tenant-2')
    mocks.repository.listEnrollments.mockReturnValueOnce(oldTenantLoad.promise).mockResolvedValueOnce([enrollment])
    mocks.repository.loadCycle.mockResolvedValue(tenantTwoCycle)
    const { result, rerender } = renderHook(() => useProjeto66Context(), { wrapper })

    mocks.session = session('tenant-2')
    rerender()
    await waitFor(() => expect(result.current.cycle?.id).toBe('cycle-tenant-2'))

    oldTenantLoad.resolve([enrollment])
    await act(async () => { await oldTenantLoad.promise; await Promise.resolve() })
    expect(result.current.cycle.id).toBe('cycle-tenant-2')
  })
})
