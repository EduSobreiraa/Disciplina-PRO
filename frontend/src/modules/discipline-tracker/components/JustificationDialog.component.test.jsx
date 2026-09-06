import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { JustificationDialog } from './JustificationDialog'

const target = { behaviorName: 'Planejar o dia', day: 6, text: '' }

describe('JustificationDialog', () => {
  it('requires a cause and saves the entered text', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const { container } = render(<JustificationDialog target={target} onSave={onSave} onClose={vi.fn()} />)

    expect(container.querySelector('dialog').open).toBe(true)
    expect(screen.getByRole('button', { name: 'Salvar causa' }).disabled).toBe(true)
    await user.type(screen.getByPlaceholderText('O que aconteceu, sem desculpas e sem julgamento?'), 'Interrupção urgente')
    await user.click(screen.getByRole('button', { name: 'Salvar causa' }))

    expect(onSave).toHaveBeenCalledWith('Interrupção urgente')
  })

  it('closes from the cancel button and the native dialog event', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(<JustificationDialog target={{ ...target, text: 'Causa anterior' }} onSave={vi.fn()} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent(container.querySelector('dialog'), new Event('cancel', { bubbles: true, cancelable: true }))

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
