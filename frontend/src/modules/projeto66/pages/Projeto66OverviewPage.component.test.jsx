import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Projeto66OverviewPage } from './Projeto66OverviewPage'

const mocks = vi.hoisted(() => ({ execution: null }))

vi.mock('react-router-dom', () => ({ Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a> }))
vi.mock('../hooks/useProjeto66Cycle', () => ({ useProjeto66Cycle: () => mocks.execution }))

function createExecution(overrides = {}) {
  return {
    cycle: { status: 'AVAILABLE', completedDays: [] },
    progress: 0,
    currentDay: 0,
    currentStreak: 0,
    phaseProgress: [{ completed: 0 }, { completed: 0 }, { completed: 0 }],
    scoreStats: { averageLast7: null, best: null },
    startCycle: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('Projeto66OverviewPage', () => {
  beforeEach(() => { mocks.execution = createExecution() })

  it('starts an available cycle and reports a retryable failure', async () => {
    const user = userEvent.setup()
    mocks.execution.startCycle.mockRejectedValueOnce(new Error('indisponível'))
    render(<Projeto66OverviewPage />)

    expect(screen.getByText('Acenda a chama')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Iniciar meu ciclo de 66 dias' }))
    await waitFor(() => expect(screen.getByRole('alert')).not.toBeNull())
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).not.toBeNull()

    mocks.execution.startCycle.mockResolvedValueOnce(undefined)
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(mocks.execution.startCycle).toHaveBeenCalledTimes(2))
  })

  it('renders active-cycle phases, streaks, and score summaries', () => {
    mocks.execution = createExecution({
      cycle: { status: 'ACTIVE', completedDays: [1, 2] },
      progress: 50,
      currentDay: 23,
      currentStreak: 1,
      phaseProgress: [{ completed: 20 }, { completed: 2 }, { completed: 0 }],
      scoreStats: { averageLast7: 48, best: { day: 20, score: 55 } },
    })
    const { rerender } = render(<Projeto66OverviewPage />)

    expect(screen.getByRole('heading', { name: '1 dia' })).not.toBeNull()
    expect(screen.getByText('F2')).not.toBeNull()
    expect(screen.getByText('dia 20')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Registrar o dia' }).getAttribute('href')).toBe('hoje')

    mocks.execution = createExecution({ ...mocks.execution, currentDay: 45, currentStreak: 2 })
    rerender(<Projeto66OverviewPage />)
    expect(screen.getByText('F3')).not.toBeNull()
    expect(screen.getByRole('heading', { name: '2 dias' })).not.toBeNull()
  })
})
