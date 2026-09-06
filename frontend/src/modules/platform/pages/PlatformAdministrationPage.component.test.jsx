import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlatformAdministrationPage } from './PlatformAdministrationPage'

const mocks = vi.hoisted(() => ({ platform: null, logout: vi.fn() }))

vi.mock('../../../app/providers/app-context', () => ({
  useAppContext: () => ({
    tenant: null,
    user: { email: 'admin@example.test' },
    logout: mocks.logout,
  }),
}))
vi.mock('../hooks/usePlatformAdministration', () => ({ usePlatformAdministration: () => mocks.platform }))

function createPlatform() {
  return {
    allowed: true,
    status: 'ready',
    mutating: false,
    error: null,
    delivery: { email: 'ceo@nova.test', status: 'SENT' },
    tenants: [
      { id: 'pending-1', name: 'Nova', slug: 'nova', timeZone: 'America/Bahia', status: 'PENDING', activeCeo: null, pendingCeoInvitation: null },
      { id: 'active-1', name: 'Ativa', slug: 'ativa', timeZone: 'UTC', status: 'ACTIVE', activeCeo: { email: 'ceo@ativa.test' }, pendingCeoInvitation: null },
      { id: 'suspended-1', name: 'Pausa', slug: 'pausa', timeZone: 'UTC', status: 'SUSPENDED', activeCeo: null, pendingCeoInvitation: { email: 'ceo@pausa.test' } },
    ],
    programs: [{
      id: 'program-1',
      name: 'Projeto 66',
      slug: 'projeto-66',
      status: 'ACTIVE',
      versions: [{ status: 'PUBLISHED', versionNumber: 2 }],
      tenantPrograms: [{ tenantId: 'active-1', status: 'ENABLED' }],
    }],
    reload: vi.fn().mockResolvedValue(undefined),
    createTenant: vi.fn().mockResolvedValue(undefined),
    transitionTenant: vi.fn().mockResolvedValue(undefined),
    inviteFirstCeo: vi.fn().mockResolvedValue(undefined),
    setProgramEnabled: vi.fn().mockResolvedValue(undefined),
  }
}

describe('PlatformAdministrationPage', () => {
  beforeEach(() => {
    mocks.logout.mockReset()
    mocks.platform = createPlatform()
  })

  it('creates a tenant and performs platform lifecycle actions', async () => {
    const user = userEvent.setup()
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('  decisão administrativa  ')
    render(<PlatformAdministrationPage />)

    expect(screen.getByText('CEO ativo:').parentElement.textContent).toContain('ceo@ativa.test')
    expect(screen.getByText('Convite de CEO pendente:').parentElement.textContent).toContain('ceo@pausa.test')
    expect(screen.getByText('Primeiro CEO ainda não convidado.')).not.toBeNull()

    await user.type(screen.getByLabelText('Nome'), 'Empresa Nova')
    await user.type(screen.getByLabelText('Slug'), 'empresa-nova')
    await user.clear(screen.getByLabelText('Timezone'))
    await user.type(screen.getByLabelText('Timezone'), 'UTC')
    await user.click(screen.getByRole('button', { name: 'Criar pendente' }))
    await waitFor(() => expect(mocks.platform.createTenant).toHaveBeenCalledWith({ name: 'Empresa Nova', slug: 'empresa-nova', timeZone: 'UTC' }))

    await user.type(screen.getByLabelText('E-mail do primeiro CEO'), 'ceo@nova.test')
    await user.click(screen.getByRole('button', { name: 'Convidar primeiro CEO' }))
    expect(mocks.platform.inviteFirstCeo).toHaveBeenCalledWith('pending-1', 'ceo@nova.test')

    await user.click(screen.getByRole('button', { name: 'Suspender' }))
    await user.click(screen.getByRole('button', { name: 'Reativar' }))
    await user.click(screen.getAllByRole('button', { name: 'Encerrar' })[0])
    await waitFor(() => expect(mocks.platform.transitionTenant).toHaveBeenCalledTimes(3))
    expect(mocks.platform.transitionTenant).toHaveBeenNthCalledWith(1, 'active-1', 'suspend', 'decisão administrativa')
    expect(mocks.platform.transitionTenant).toHaveBeenNthCalledWith(2, 'suspended-1', 'reactivate', 'decisão administrativa')
    expect(mocks.platform.transitionTenant).toHaveBeenNthCalledWith(3, 'pending-1', 'close', 'decisão administrativa')

    const enabledProgram = screen.getByRole('checkbox', { name: 'Ativa' })
    await user.click(enabledProgram)
    expect(mocks.platform.setProgramEnabled).toHaveBeenCalledWith('active-1', 'program-1', false)
    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(mocks.logout).toHaveBeenCalledOnce()

    prompt.mockRestore()
  })
})
