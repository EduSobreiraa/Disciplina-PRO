import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/app-context'
import { createTenantAdministrationHttpRepository } from '../repositories/tenant-administration.http.repository'

export function useTenantAdministration() {
  const session = useAppContext()
  const canManage = ['CEO', 'MANAGER'].includes(session.membership?.role)
  const canManageTeams = session.membership?.role === 'CEO'
  const [state, setState] = useState({ status: 'loading', memberships: [], teams: [], invitations: [], error: null, mutating: false, delivery: null })
  const repository = useMemo(() => createTenantAdministrationHttpRepository({
    baseUrl: '/api',
    getTenantId: () => session.tenant?.id,
    authorizedFetch: session.sessionClient.authorizedFetch,
  }), [session.sessionClient, session.tenant?.id])

  const load = useCallback(async () => {
    if (!canManage) {
      setState({ status: 'denied', memberships: [], teams: [], error: null })
      return null
    }
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const [memberships, teams, invitations] = await Promise.all([
        repository.listMemberships(),
        canManageTeams ? repository.listTeams() : Promise.resolve([]),
        repository.listInvitations(),
      ])
      const next = { status: 'ready', memberships, teams, invitations, error: null, mutating: false, delivery: state.delivery }
      setState(next)
      return next
    } catch (error) {
      setState({ status: 'error', memberships: [], teams: [], invitations: [], error, mutating: false, delivery: null })
      throw error
    }
  }, [canManage, canManageTeams, repository, state.delivery])

  useEffect(() => {
    let active = true
    if (!canManage) {
      return () => { active = false }
    }
    Promise.all([repository.listMemberships(), canManageTeams ? repository.listTeams() : Promise.resolve([]), repository.listInvitations()])
      .then(([memberships, teams, invitations]) => { if (active) setState({ status: 'ready', memberships, teams, invitations, error: null, mutating: false, delivery: null }) })
      .catch((error) => { if (active) setState({ status: 'error', memberships: [], teams: [], invitations: [], error, mutating: false, delivery: null }) })
    return () => { active = false }
  }, [canManage, canManageTeams, repository])

  const mutate = useCallback(async (operation) => {
    setState((current) => ({ ...current, mutating: true, error: null }))
    try {
      await operation()
      const [memberships, teams, invitations] = await Promise.all([repository.listMemberships(), canManageTeams ? repository.listTeams() : Promise.resolve([]), repository.listInvitations()])
      setState((current) => ({ status: 'ready', memberships, teams, invitations, error: null, mutating: false, delivery: current.delivery }))
      return true
    } catch (error) {
      setState((current) => ({ ...current, error, mutating: false }))
      throw error
    }
  }, [canManageTeams, repository])

  const mutateTeam = useCallback((operation) => canManageTeams ? mutate(operation) : Promise.resolve(false), [canManageTeams, mutate])

  return {
    ...state,
    status: canManage ? state.status : 'denied',
    canManage,
    canManageTeams,
    reload: load,
    createTeam: (name) => mutateTeam(() => repository.createTeam(name)),
    renameTeam: (teamId, name) => mutateTeam(() => repository.renameTeam(teamId, name)),
    archiveTeam: (teamId) => mutateTeam(() => repository.archiveTeam(teamId)),
    restoreTeam: (teamId) => mutateTeam(() => repository.restoreTeam(teamId)),
    changeMembershipRole: (membershipId, role) => mutateTeam(() => repository.changeMembershipRole(membershipId, role)),
    changeMembershipStatus: (membershipId, action, reason) => mutate(() => repository.changeMembershipStatus(membershipId, action, reason)),
    assignTeamMembership: (teamId, membershipId, role) => mutateTeam(() => repository.assignTeamMembership(teamId, membershipId, role)),
    endTeamMembership: (teamId, membershipId) => mutateTeam(() => repository.endTeamMembership(teamId, membershipId)),
    actorMembershipId: session.membership?.id,
    createInvitation: (input) => mutate(async () => {
      const result = await repository.createInvitation(input)
      setState((current) => ({ ...current, delivery: { email: result.email, status: result.deliveryStatus } }))
      return result
    }),
    resendInvitation: (invitationId) => mutate(async () => {
      const result = await repository.resendInvitation(invitationId)
      setState((current) => ({ ...current, delivery: { email: result.email, status: result.deliveryStatus } }))
      return result
    }),
    revokeInvitation: (invitationId) => mutate(() => repository.revokeInvitation(invitationId)),
  }
}
