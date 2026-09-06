import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROJETO66_ACTIVITY_KEYS } from '../data/projeto66-contract'
import { Projeto66NewSelfPage } from './Projeto66NewSelfPage'

const mocks = vi.hoisted(() => ({ execution: null }))

vi.mock('../hooks/useProjeto66Cycle', () => ({ useProjeto66Cycle: () => mocks.execution }))

function createExecution() {
  return {
    loadPrivateResponse: vi.fn().mockResolvedValue({ definition: 'Agir com clareza' }),
    savePrivateResponse: vi.fn().mockResolvedValue(undefined),
  }
}

describe('Projeto66NewSelfPage', () => {
  beforeEach(() => { mocks.execution = createExecution() })

  it('loads and saves the definition, check-in, and difficult-day note', async () => {
    const user = userEvent.setup()
    render(<Projeto66NewSelfPage />)

    await waitFor(() => expect(screen.getByLabelText('Declaração do Novo Eu').value).toBe('Agir com clareza'))
    await user.click(screen.getByRole('button', { name: 'Salvar minha definição' }))
    await user.click(screen.getByRole('button', { name: '✓ Sim, sustentei' }))
    await user.click(screen.getByRole('button', { name: 'Registrar check-in' }))
    await user.type(screen.getByLabelText('Registro do dia difícil'), 'Rotina interrompida')
    await user.click(screen.getByRole('button', { name: 'Guardar registro privado' }))

    await waitFor(() => expect(mocks.execution.savePrivateResponse).toHaveBeenCalledTimes(3))
    expect(mocks.execution.savePrivateResponse).toHaveBeenNthCalledWith(1, PROJETO66_ACTIVITY_KEYS.newSelfDefinition, expect.objectContaining({ definition: 'Agir com clareza' }))
    expect(mocks.execution.savePrivateResponse).toHaveBeenNthCalledWith(2, PROJETO66_ACTIVITY_KEYS.newSelfCheckin, expect.objectContaining({ alignment: true }))
    expect(mocks.execution.savePrivateResponse).toHaveBeenNthCalledWith(3, PROJETO66_ACTIVITY_KEYS.difficultDay, expect.objectContaining({ note: 'Rotina interrompida' }))
    expect(screen.getByLabelText('Registro do dia difícil').value).toBe('')
    expect(screen.getByRole('status').textContent).toContain('Dia difícil acolhido')
  })

  it('allows a training check-in and exposes a failed private save', async () => {
    const user = userEvent.setup()
    mocks.execution.loadPrivateResponse.mockRejectedValueOnce(new Error('ausente'))
    mocks.execution.savePrivateResponse.mockRejectedValueOnce(new Error('indisponível'))
    render(<Projeto66NewSelfPage />)

    await user.click(screen.getByRole('button', { name: '↺ Ainda estou treinando' }))
    await user.click(screen.getByRole('button', { name: 'Registrar check-in' }))

    await waitFor(() => expect(screen.getByRole('alert')).not.toBeNull())
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).not.toBeNull()
    expect(mocks.execution.savePrivateResponse).toHaveBeenCalledWith(PROJETO66_ACTIVITY_KEYS.newSelfCheckin, expect.objectContaining({ alignment: false }))
  })
})
