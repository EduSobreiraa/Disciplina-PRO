import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from './AppProvider'
import { useAppContext } from './app-context'

const mocks = vi.hoisted(() => ({
  sessionClient: {
    restore: vi.fn(),
    context: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    authorizedFetch: vi.fn(),
  },
}))

vi.mock('../../modules/auth/session.client', () => ({ createSessionClient: () => mocks.sessionClient }))

const context = {
  user: { id: 'user-1', email: 'owner@example.test' },
  organizations: [
    { tenant: { id: 'tenant-1', name: 'Primeira' }, membership: { id: 'membership-1' } },
    { tenant: { id: 'tenant-2', name: 'Segunda' }, membership: { id: 'membership-2' } },
  ],
  platformAccess: null,
}

function ContextConsumer() {
  const appContext = useAppContext()
  return <>
    <div data-testid="session">{appContext.status}:{appContext.tenant?.id ?? 'none'}:{appContext.error?.code ?? 'ok'}</div>
    <button type="button" onClick={() => appContext.selectTenant('missing')}>Tenant ausente</button>
    <button type="button" onClick={() => appContext.selectTenant('tenant-2')}>Segundo tenant</button>
    <button type="button" onClick={() => appContext.logout()}>Sair</button>
    <button type="button" onClick={() => appContext.login('owner@example.test', 'password').catch(() => {})}>Entrar</button>
  </>
}

describe('AppProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sessionClient.restore.mockResolvedValue(undefined)
    mocks.sessionClient.context.mockResolvedValue(context)
    mocks.sessionClient.login.mockResolvedValue(undefined)
    mocks.sessionClient.logout.mockResolvedValue(undefined)
  })

  it('restores the session and selects only an available tenant', async () => {
    render(<AppProvider><ContextConsumer /></AppProvider>)
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('authenticated:tenant-1:ok'))

    fireEvent.click(screen.getByRole('button', { name: 'Tenant ausente' }))
    expect(screen.getByTestId('session').textContent).toBe('authenticated:tenant-1:ok')
    fireEvent.click(screen.getByRole('button', { name: 'Segundo tenant' }))
    expect(screen.getByTestId('session').textContent).toBe('authenticated:tenant-2:ok')
  })

  it('exposes login failure and clears an authenticated session on logout', async () => {
    render(<AppProvider><ContextConsumer /></AppProvider>)
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('authenticated:tenant-1:ok'))

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('anonymous:none:ok'))
    expect(mocks.sessionClient.logout).toHaveBeenCalledOnce()

    const failure = Object.assign(new Error('denied'), { code: 'INVALID_CREDENTIALS' })
    mocks.sessionClient.login.mockRejectedValueOnce(failure)
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('anonymous:none:INVALID_CREDENTIALS'))
  })
})
