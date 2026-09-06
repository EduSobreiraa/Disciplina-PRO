import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROJETO66_ACTIVITY_KEYS } from '../data/projeto66-contract'
import { Projeto66MeditationPage } from './Projeto66MeditationPage'

const mocks = vi.hoisted(() => ({ execution: null, timer: null }))

vi.mock('../hooks/useProjeto66Cycle', () => ({ useProjeto66Cycle: () => mocks.execution }))
vi.mock('../hooks/useCountdownTimer', () => ({ useCountdownTimer: () => mocks.timer }))

describe('Projeto66MeditationPage', () => {
  beforeEach(() => {
    mocks.execution = { savePrivateResponse: vi.fn().mockResolvedValue(undefined) }
    mocks.timer = { seconds: 600, running: false, complete: false, toggle: vi.fn(), reset: vi.fn() }
  })

  it('changes modes and saves a completed meditation', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Projeto66MeditationPage />)

    expect(screen.getByText('10:00')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: /5.*Respiração/ }))
    expect(mocks.timer.reset).toHaveBeenCalledWith(300)

    mocks.timer = { ...mocks.timer, seconds: 0, complete: true }
    rerender(<Projeto66MeditationPage />)
    expect(screen.getByRole('button', { name: 'Concluído' })).not.toBeNull()
    await user.type(screen.getByLabelText('Observações da meditação'), 'Respiração mais estável')
    await user.click(screen.getByRole('button', { name: 'Salvar no histórico privado' }))

    await waitFor(() => expect(mocks.execution.savePrivateResponse).toHaveBeenCalledWith(PROJETO66_ACTIVITY_KEYS.meditation, expect.objectContaining({ mode: 'Respiração', durationMinutes: 5, note: 'Respiração mais estável' })))
    expect(screen.getByRole('button', { name: 'Meditação registrada' }).disabled).toBe(true)
  })

  it('pauses a running timer and presents a retry after save failure', async () => {
    const user = userEvent.setup()
    mocks.timer = { seconds: 42, running: true, complete: true, toggle: vi.fn(), reset: vi.fn() }
    mocks.execution.savePrivateResponse.mockRejectedValueOnce(new Error('indisponível'))
    render(<Projeto66MeditationPage />)

    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(mocks.timer.toggle).toHaveBeenCalledOnce()
    await user.type(screen.getByLabelText('Observações da meditação'), 'Tensão inicial')
    await user.click(screen.getByRole('button', { name: 'Salvar no histórico privado' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não foi possível'))
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).not.toBeNull()
  })
})
