import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MembershipAdministrationPanel } from './MembershipAdministrationPanel'

function createAdministration() {
  return {
    memberships: [
      { id: 'member-1', role: 'USER', status: 'ACTIVE', user: { email: 'ana@example.test' }, teams: [{ id: 'assignment-1', teamId: 'team-1', role: 'MEMBER', team: { name: 'Produto' } }] },
      { id: 'manager-1', role: 'MANAGER', status: 'ACTIVE', user: { email: 'bia@example.test' }, teams: [] },
      { id: 'ceo-1', role: 'CEO', status: 'ACTIVE', user: { email: 'ceo@example.test' }, teams: [] },
      { id: 'inactive-1', role: 'USER', status: 'INACTIVE', user: { email: 'rui@example.test' }, teams: [] },
    ],
    teams: [{ id: 'team-1', name: 'Produto', archivedAt: null }, { id: 'team-2', name: 'Arquivo', archivedAt: '2026-01-01' }],
    canManageTeams: true,
    mutating: false,
    error: null,
    assignTeamMembership: vi.fn().mockResolvedValue(true),
    endTeamMembership: vi.fn().mockResolvedValue(undefined),
    changeMembershipRole: vi.fn().mockResolvedValue(undefined),
    changeMembershipStatus: vi.fn().mockResolvedValue(true),
  }
}

describe('MembershipAdministrationPanel', () => {
  let administration

  beforeEach(() => {
    administration = createAdministration()
  })

  it('assigns members to active teams and manages roles', async () => {
    const user = userEvent.setup()
    render(<MembershipAdministrationPanel administration={administration} />)

    expect(screen.queryByRole('option', { name: 'Arquivo' })).toBeNull()
    await user.selectOptions(screen.getByLabelText('Membro'), 'manager-1')
    await user.selectOptions(screen.getByLabelText('Time'), 'team-1')
    await user.selectOptions(screen.getByLabelText('Papel no time'), 'MANAGER')
    await user.click(screen.getByRole('button', { name: 'Vincular' }))

    await waitFor(() => expect(administration.assignTeamMembership).toHaveBeenCalledWith('team-1', 'manager-1', 'MANAGER'))
    expect(screen.getByLabelText('Membro').value).toBe('')

    await user.click(screen.getByRole('button', { name: 'Tornar gestor' }))
    await user.click(screen.getByRole('button', { name: 'Remover ana@example.test de Produto' }))
    expect(administration.changeMembershipRole).toHaveBeenCalledWith('member-1', 'MANAGER')
    expect(administration.endTeamMembership).toHaveBeenCalledWith('team-1', 'member-1')
  })

  it('confirms status transitions with an operational reason', async () => {
    const user = userEvent.setup()
    const { container } = render(<MembershipAdministrationPanel administration={administration} />)

    await user.click(screen.getAllByRole('button', { name: 'Suspender' })[0])
    expect(container.querySelector('dialog').open).toBe(true)
    await user.type(screen.getByLabelText('Motivo operacional'), 'Solicitação da gestão')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(administration.changeMembershipStatus).toHaveBeenCalledWith('member-1', 'suspend', 'Solicitação da gestão'))
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Reativar' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
