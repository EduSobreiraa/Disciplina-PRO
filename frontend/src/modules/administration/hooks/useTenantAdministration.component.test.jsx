import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTenantAdministration } from './useTenantAdministration'

const mocks = vi.hoisted(() => ({
  session: null,
  repository: {
    listMemberships: vi.fn(),
    listTeams: vi.fn(),
    listInvitations: vi.fn(),
    createTeam: vi.fn(),
    renameTeam: vi.fn(),
    archiveTeam: vi.fn(),
    restoreTeam: vi.fn(),
    changeMembershipRole: vi.fn(),
    changeMembershipStatus: vi.fn(),
    assignTeamMembership: vi.fn(),
    endTeamMembership: vi.fn(),
    createInvitation: vi.fn(),
    resendInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
  },
}))

vi.mock('../../../app/providers/app-context', () => ({ useAppContext: () => mocks.session }))
vi.mock('../repositories/tenant-administration.http.repository', () => ({
  createTenantAdministrationHttpRepository: () => ({ ...mocks.repository }),
}))

const memberships = [{ id: 'membership-1', role: 'USER' }]
const teams = [{ id: 'team-1', name: 'Time principal' }]
const invitations = [{ id: 'invitation-1', email: 'pessoa@example.test' }]

function session(role = 'CEO', tenantId = 'tenant-1') {
  return {
    tenant: { id: tenantId },
    membership: { id: 'actor-membership', role },
    sessionClient: { authorizedFetch: vi.fn() },
  }
}

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

describe('useTenantAdministration', () => {
  beforeEach(() => {
    for (const operation of Object.values(mocks.repository)) operation.mockReset()
    mocks.repository.listMemberships.mockResolvedValue(memberships)
    mocks.repository.listTeams.mockResolvedValue(teams)
    mocks.repository.listInvitations.mockResolvedValue(invitations)
    for (const operation of [
      mocks.repository.createTeam,
      mocks.repository.renameTeam,
      mocks.repository.archiveTeam,
      mocks.repository.restoreTeam,
      mocks.repository.changeMembershipRole,
      mocks.repository.changeMembershipStatus,
      mocks.repository.assignTeamMembership,
      mocks.repository.endTeamMembership,
      mocks.repository.revokeInvitation,
    ]) operation.mockResolvedValue({})
    mocks.repository.createInvitation.mockResolvedValue({ email: 'nova@example.test', deliveryStatus: 'SENT' })
    mocks.repository.resendInvitation.mockResolvedValue({ email: 'pessoa@example.test', deliveryStatus: 'FAILED' })
    mocks.session = session()
  })

  it('denies non-managers without loading administration data', async () => {
    mocks.session = session('USER')
    const { result } = renderHook(() => useTenantAdministration())

    expect(result.current.status).toBe('denied')
    expect(result.current.canManage).toBe(false)
    await expect(result.current.createTeam('Sem permissão')).resolves.toBe(false)
    await expect(result.current.reload()).resolves.toBeNull()
    expect(mocks.repository.listMemberships).not.toHaveBeenCalled()
  })

  it('loads the CEO scope and delegates every supported mutation', async () => {
    const { result } = renderHook(() => useTenantAdministration())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.memberships).toEqual(memberships)
    expect(result.current.teams).toEqual(teams)
    expect(result.current.invitations).toEqual(invitations)
    expect(result.current.actorMembershipId).toBe('actor-membership')
    await act(async () => {
      await expect(result.current.reload()).resolves.toMatchObject({ status: 'ready', memberships, teams, invitations })
    })

    const mutations = [
      ['createTeam', ['Novo time']],
      ['renameTeam', ['team-1', 'Novo nome']],
      ['archiveTeam', ['team-1']],
      ['restoreTeam', ['team-1']],
      ['changeMembershipRole', ['membership-1', 'MANAGER']],
      ['changeMembershipStatus', ['membership-1', 'suspend', 'Motivo']],
      ['assignTeamMembership', ['team-1', 'membership-1', 'MEMBER']],
      ['endTeamMembership', ['team-1', 'membership-1']],
    ]
    for (const [name, argumentsList] of mutations) {
      await act(async () => { expect(await result.current[name](...argumentsList)).toBe(true) })
    }

    await act(async () => { expect(await result.current.createInvitation({ email: 'nova@example.test' })).toBe(true) })
    expect(result.current.delivery).toEqual({ email: 'nova@example.test', status: 'SENT' })
    await act(async () => { expect(await result.current.resendInvitation('invitation-1')).toBe(true) })
    expect(result.current.delivery).toEqual({ email: 'pessoa@example.test', status: 'FAILED' })
    await act(async () => { expect(await result.current.revokeInvitation('invitation-1')).toBe(true) })

    expect(mocks.repository.createTeam).toHaveBeenCalledWith('Novo time')
    expect(mocks.repository.changeMembershipStatus).toHaveBeenCalledWith('membership-1', 'suspend', 'Motivo')
    expect(mocks.repository.revokeInvitation).toHaveBeenCalledWith('invitation-1')
    expect(result.current.notice).toBe('Convite revogado.')
  })

  it('loads a manager without team administration and still permits member status changes', async () => {
    mocks.session = session('MANAGER')
    const { result } = renderHook(() => useTenantAdministration())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.canManageTeams).toBe(false)
    expect(result.current.teams).toEqual([])
    expect(mocks.repository.listTeams).not.toHaveBeenCalled()
    await expect(result.current.archiveTeam('team-1')).resolves.toBe(false)
    await act(async () => { expect(await result.current.changeMembershipStatus('membership-1', 'reactivate')).toBe(true) })
    expect(mocks.repository.changeMembershipStatus).toHaveBeenCalledOnce()
  })

  it('exposes load and mutation failures without leaving the hook busy', async () => {
    const { result } = renderHook(() => useTenantAdministration())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    const loadFailure = new Error('load failed')
    mocks.repository.listMemberships.mockRejectedValueOnce(loadFailure)
    await act(async () => { await expect(result.current.reload()).rejects.toBe(loadFailure) })
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe(loadFailure)

    const mutationFailure = new Error('mutation failed')
    mocks.repository.changeMembershipStatus.mockRejectedValueOnce(mutationFailure)
    await act(async () => { await expect(result.current.changeMembershipStatus('membership-1', 'suspend')).rejects.toBe(mutationFailure) })
    expect(result.current.mutating).toBe(false)
    expect(result.current.error).toBe(mutationFailure)
  })

  it('exposes a failure from the initial administration load', async () => {
    const failure = new Error('initial load failed')
    mocks.repository.listMemberships.mockRejectedValueOnce(failure)

    const { result } = renderHook(() => useTenantAdministration())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(failure)
    expect(result.current.mutating).toBe(false)
  })

  it('ignores a load completed after the selected tenant changes', async () => {
    const oldTenantLoad = deferred()
    mocks.repository.listMemberships.mockReturnValueOnce(oldTenantLoad.promise).mockResolvedValueOnce([{ id: 'membership-2' }])
    const { result, rerender } = renderHook(() => useTenantAdministration())

    mocks.session = session('CEO', 'tenant-2')
    rerender()
    await waitFor(() => expect(result.current.memberships).toEqual([{ id: 'membership-2' }]))

    oldTenantLoad.resolve([{ id: 'stale-membership' }])
    await act(async () => { await oldTenantLoad.promise })
    expect(result.current.memberships).toEqual([{ id: 'membership-2' }])
  })
})
