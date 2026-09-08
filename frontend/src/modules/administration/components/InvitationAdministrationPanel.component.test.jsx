import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InvitationAdministrationPanel } from './InvitationAdministrationPanel'

const administration = { canManageTeams: true, teams: [], memberships: [], invitations: [], mutating: false }

describe('Invitation delivery feedback', () => {
  it('does not announce delivery before an invitation is sent', () => {
    render(<InvitationAdministrationPanel administration={administration} />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('distinguishes provider acceptance from recipient delivery', () => {
    render(<InvitationAdministrationPanel administration={{ ...administration, delivery: { email: 'invite@disciplina.test', status: 'SENT' } }} />)
    expect(screen.getByRole('status').textContent).toContain('invite@disciplina.test')
    expect(screen.getByRole('status').textContent).toContain('aceita pelo provedor de e-mail; recebimento ainda não confirmado')
  })

  it.each(['FAILED', undefined])('requires review when delivery status is %s', (status) => {
    render(<InvitationAdministrationPanel administration={{ ...administration, delivery: { email: 'invite@disciplina.test', status } }} />)
    expect(screen.getByRole('status').textContent).toContain('não confirmada; consulte os avisos de revisão antes de reenviar')
  })
})
