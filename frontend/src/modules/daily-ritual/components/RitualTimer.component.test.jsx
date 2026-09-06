import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TIMER_SECONDS, TOTAL_CYCLES } from '../data/ritual-content'
import { RitualTimer } from './RitualTimer'

function timer(overrides = {}) {
  return {
    completedCycles: 0,
    remainingSeconds: TIMER_SECONDS,
    running: false,
    ...overrides,
  }
}

describe('RitualTimer', () => {
  it('starts, pauses, resumes, and resets a focus cycle', () => {
    const onToggle = vi.fn()
    const onReset = vi.fn()
    const { rerender } = render(<RitualTimer timer={timer()} onToggle={onToggle} onReset={onReset} />)

    fireEvent.click(screen.getByRole('button', { name: '▶ Iniciar ciclo' }))
    expect(onToggle).toHaveBeenCalledOnce()

    rerender(<RitualTimer timer={timer({ running: true, remainingSeconds: 65 })} onToggle={onToggle} onReset={onReset} />)
    expect(screen.getByText('01:05')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '⏸ Pausar ciclo' }))

    rerender(<RitualTimer timer={timer({ remainingSeconds: 60 })} onToggle={onToggle} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: '▶ Retomar ciclo' }))
    fireEvent.click(screen.getByRole('button', { name: '↺ Reiniciar' }))

    expect(onToggle).toHaveBeenCalledTimes(3)
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('shows completed cycles and disables actions while complete or busy', () => {
    const { rerender } = render(<RitualTimer timer={timer({ completedCycles: 1 })} onToggle={vi.fn()} onReset={vi.fn()} />)

    expect(screen.getByRole('button', { name: '▶ Próximo ciclo' })).not.toBeNull()
    expect(screen.getByLabelText(`1 de ${TOTAL_CYCLES} ciclos concluídos`).firstChild.textContent).toBe('✓')

    rerender(<RitualTimer timer={timer({ completedCycles: TOTAL_CYCLES })} onToggle={vi.fn()} onReset={vi.fn()} busy />)
    expect(screen.getByRole('button', { name: '✓ Dia completo' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '↺ Reiniciar' }).disabled).toBe(true)
  })
})
