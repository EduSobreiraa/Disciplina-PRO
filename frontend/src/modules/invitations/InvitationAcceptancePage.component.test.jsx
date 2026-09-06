import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvitationAcceptancePage } from './InvitationAcceptancePage'

const mocks = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  navigate: vi.fn(),
  token: 'a'.repeat(43),
  session: null,
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ hash: mocks.token ? `#token=${mocks.token}` : '' }),
  useNavigate: () => mocks.navigate,
}))
vi.mock('../../app/providers/app-context', () => ({ useAppContext: () => mocks.session }))
vi.mock('./invitation-acceptance.client', () => ({
  acceptInvitation: mocks.acceptInvitation,
  readInvitationToken: () => mocks.token,
}))

const password = 'Minha frase de senha segura'

function anonymousSession(status = 'anonymous') {
  return {
    authenticated: false,
    status,
    user: null,
    sessionClient: { login: vi.fn(), authorizedFetch: vi.fn() },
    logout: vi.fn(),
  }
}

async function submitNewIdentity(user, confirmation = password) {
  await user.type(screen.getByLabelText('Crie sua senha'), password)
  await user.type(screen.getByLabelText('Confirme sua senha'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Criar conta e aceitar convite' }))
}

describe('InvitationAcceptancePage', () => {
  beforeEach(() => {
    mocks.acceptInvitation.mockReset().mockResolvedValue(undefined)
    mocks.navigate.mockReset()
    mocks.token = 'a'.repeat(43)
    mocks.session = anonymousSession()
  })

  it('rejects an incomplete link without offering account creation', () => {
    mocks.token = null
    render(<InvitationAcceptancePage />)

    expect(screen.getByRole('alert').textContent).toContain('Link de convite inválido')
    expect(screen.queryByRole('button', { name: 'Criar conta e aceitar convite' })).toBeNull()
  })

  it('waits for session restoration before showing credentials', () => {
    mocks.session = anonymousSession('loading')
    render(<InvitationAcceptancePage />)

    expect(screen.getByRole('status').textContent).toBe('Verificando sessão…')
    expect(screen.queryByLabelText('Crie sua senha')).toBeNull()
  })

  it('validates password confirmation and accepts a new identity', async () => {
    const user = userEvent.setup()
    render(<InvitationAcceptancePage />)

    await submitNewIdentity(user, `${password} diferente`)
    expect(screen.getByRole('alert').textContent).toBe('As senhas precisam ser iguais.')
    expect(mocks.acceptInvitation).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('Confirme sua senha'))
    await user.type(screen.getByLabelText('Confirme sua senha'), password)
    await user.click(screen.getByRole('button', { name: 'Criar conta e aceitar convite' }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Convite aceito!'))
    expect(mocks.acceptInvitation).toHaveBeenCalledWith(expect.objectContaining({
      token: mocks.token,
      password,
      existingIdentity: false,
    }))
    expect(mocks.navigate).toHaveBeenCalledWith('/convites/aceitar', { replace: true })
    expect(screen.getByRole('link', { name: 'Entrar no Disciplina PRO' }).getAttribute('href')).toBe('/login')
  })

  it('requests the existing account credentials and authenticates before acceptance', async () => {
    const user = userEvent.setup()
    mocks.acceptInvitation.mockRejectedValueOnce({ code: 'EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED' })
    render(<InvitationAcceptancePage />)

    await submitNewIdentity(user)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('já possui uma conta'))

    await user.type(screen.getByLabelText('E-mail'), 'convidado@example.test')
    await user.type(screen.getByLabelText('Senha', { exact: true }), password)
    await user.click(screen.getByRole('button', { name: 'Aceitar convite', exact: true }))

    await waitFor(() => expect(mocks.session.sessionClient.login).toHaveBeenCalledWith('convidado@example.test', password))
    expect(mocks.acceptInvitation).toHaveBeenLastCalledWith(expect.objectContaining({ existingIdentity: true }))
  })

  it.each([
    ['INVITATION_INVALID', 'Convite inválido, expirado'],
    ['INVALID_INVITATION_DATA', 'Confira o convite e use uma senha'],
    ['REQUEST_FAILED', 'Confira suas credenciais e conexão'],
  ])('shows a safe message for %s', async (code, expectedMessage) => {
    const user = userEvent.setup()
    mocks.acceptInvitation.mockRejectedValueOnce({ code })
    render(<InvitationAcceptancePage />)

    await submitNewIdentity(user)

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(expectedMessage))
  })

  it('accepts with the authenticated session and keeps access directed to the app', async () => {
    const user = userEvent.setup()
    mocks.session = {
      ...anonymousSession('authenticated'),
      authenticated: true,
      user: { email: 'convidado@example.test' },
    }
    render(<InvitationAcceptancePage />)

    expect(screen.getByText('Conta conectada: convidado@example.test')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Aceitar convite', exact: true }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Convite aceito!'))
    expect(mocks.session.sessionClient.login).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Entrar no Disciplina PRO' }).getAttribute('href')).toBe('/app')
  })

  it('allows an authenticated user to leave the current account', async () => {
    const user = userEvent.setup()
    mocks.session = {
      ...anonymousSession('authenticated'),
      authenticated: true,
      user: { email: 'convidado@example.test' },
    }
    render(<InvitationAcceptancePage />)

    await user.click(screen.getByRole('button', { name: 'Usar outra conta' }))

    await waitFor(() => expect(mocks.session.logout).toHaveBeenCalledOnce())
  })
})
