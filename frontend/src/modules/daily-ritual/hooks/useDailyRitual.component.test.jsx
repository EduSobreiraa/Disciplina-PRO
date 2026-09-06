import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDailyRitual } from './useDailyRitual'

const mocks = vi.hoisted(() => ({
  dateKey: '2026-09-06',
  session: null,
  repository: {
    load: vi.fn(),
    setCheck: vi.fn(),
    changeTimer: vi.fn(),
  },
}))

vi.mock('../../../app/providers/app-context', () => ({ useAppContext: () => mocks.session }))
vi.mock('../repositories/daily-ritual.http.repository', () => ({
  createDailyRitualHttpRepository: () => ({ ...mocks.repository }),
  getDateKeyInTimeZone: () => mocks.dateKey,
  mapRitualDay: (day) => day,
}))

function session(tenantId = 'tenant-1', timeZone = 'America/Bahia') {
  return {
    tenant: tenantId ? { id: tenantId, timeZone } : null,
    sessionClient: { authorizedFetch: vi.fn() },
  }
}

function ritualDay({ checks = {}, timer = {} } = {}) {
  return {
    checks,
    timer: {
      completedCycles: 0,
      remainingSeconds: 1800,
      runningStartedAt: null,
      runningUntil: null,
      ...timer,
    },
  }
}

describe('useDailyRitual', () => {
  beforeEach(() => {
    for (const operation of Object.values(mocks.repository)) operation.mockReset()
    mocks.dateKey = '2026-09-06'
    mocks.session = session()
    mocks.repository.load.mockResolvedValue(ritualDay())
    mocks.repository.setCheck.mockResolvedValue(ritualDay())
    mocks.repository.changeTimer.mockResolvedValue(ritualDay())
  })

  it('loads and reloads the ritual projection for the current tenant day', async () => {
    mocks.repository.load.mockResolvedValue(ritualDay({ checks: { opening: { 0: true } } }))
    const { result } = renderHook(() => useDailyRitual())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.dateKey).toBe('2026-09-06')
    expect(result.current.checks.opening[0]).toBe(true)
    expect(result.current.progress.completed).toBe(1)

    await act(async () => {
      await expect(result.current.reload()).resolves.toEqual(expect.objectContaining({ checks: { opening: { 0: true } } }))
    })
    expect(mocks.repository.load).toHaveBeenLastCalledWith('2026-09-06')
  })

  it('updates checks and sends start, pause, and reset timer commands', async () => {
    const runningUntil = new Date(Date.now() + 60_000).toISOString()
    mocks.repository.setCheck.mockResolvedValueOnce(ritualDay({ checks: { opening: { 0: true } } }))
    mocks.repository.changeTimer
      .mockResolvedValueOnce(ritualDay({ timer: { runningStartedAt: new Date().toISOString(), runningUntil } }))
      .mockResolvedValueOnce(ritualDay({ timer: { remainingSeconds: 1700 } }))
      .mockResolvedValueOnce(ritualDay())
    const { result } = renderHook(() => useDailyRitual())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => { await result.current.toggleCheck('opening', 'review-panel', 0) })
    expect(mocks.repository.setCheck).toHaveBeenCalledWith('2026-09-06', 'opening', 'review-panel', true)

    await act(async () => { await result.current.toggleTimer() })
    expect(result.current.timer.running).toBe(true)
    expect(mocks.repository.changeTimer).toHaveBeenLastCalledWith('2026-09-06', 'start')

    await act(async () => { await result.current.toggleTimer() })
    expect(result.current.timer.running).toBe(false)
    expect(mocks.repository.changeTimer).toHaveBeenLastCalledWith('2026-09-06', 'pause')

    await act(async () => { await result.current.resetTimer() })
    expect(mocks.repository.changeTimer).toHaveBeenLastCalledWith('2026-09-06', 'reset')
  })

  it('exposes initial, reload, and mutation failures without remaining busy', async () => {
    const initialFailure = new Error('initial load failed')
    mocks.session = session(null)
    mocks.repository.load.mockRejectedValueOnce(initialFailure)
    const { result } = renderHook(() => useDailyRitual())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(initialFailure)

    mocks.repository.load.mockResolvedValueOnce(ritualDay())
    await act(async () => { await result.current.reload() })
    expect(result.current.status).toBe('ready')

    const reloadFailure = new Error('reload failed')
    mocks.repository.load.mockRejectedValueOnce(reloadFailure)
    await act(async () => { await expect(result.current.reload()).rejects.toBe(reloadFailure) })
    expect(result.current.error).toBe(reloadFailure)

    const mutationFailure = new Error('mutation failed')
    mocks.repository.setCheck.mockRejectedValueOnce(mutationFailure)
    await act(async () => { await expect(result.current.toggleCheck('opening', 'review-panel', 0)).rejects.toBe(mutationFailure) })
    expect(result.current.error).toBe(mutationFailure)
    expect(result.current.mutating).toBe(false)
  })

  it('refreshes the date and projection after a tenant timezone change', async () => {
    const { result, rerender } = renderHook(() => useDailyRitual())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.dateKey = '2026-09-07'
    mocks.session = session('tenant-2', 'Pacific/Kiritimati')
    rerender()

    await waitFor(() => expect(result.current.dateKey).toBe('2026-09-07'))
    await waitFor(() => expect(mocks.repository.load).toHaveBeenCalledWith('2026-09-07'))
  })

  it('settles an expired running timer with a fresh server projection', async () => {
    const running = ritualDay({ timer: { remainingSeconds: 1, runningUntil: new Date(Date.now() - 1).toISOString() } })
    const settled = ritualDay({ timer: { completedCycles: 1 } })
    mocks.repository.load.mockResolvedValueOnce(running).mockResolvedValueOnce(settled)
    const { result } = renderHook(() => useDailyRitual())

    await waitFor(() => expect(result.current.timer.running).toBe(true))
    await waitFor(() => expect(result.current.timer.running).toBe(false))

    expect(result.current.timer.completedCycles).toBe(1)
    expect(mocks.repository.load).toHaveBeenCalledTimes(2)
  })
})
