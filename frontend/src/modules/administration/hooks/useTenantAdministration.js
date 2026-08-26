import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../../../app/providers/app-context'
import { createTenantAsyncScope } from '../../../app/providers/tenant-async-scope'
import { createTenantAdministrationHttpRepository } from '../repositories/tenant-administration.http.repository'

export function useTenantAdministration() {
  const session = useAppContext()
  const tenantId = session.tenant?.id ?? null
  const scopeRef = useRef(createTenantAsyncScope(tenantId))
  scopeRef.current.sync(tenantId)
  const canManage = ['CEO', 'MANAGER'].includes(session.membership?.role)
  const canManageTeams = session.membership?.role === 'CEO'
  const [state, setState] = useState({ status: 'loading', memberships: [], teams: [], invitations: [], error: null, mutating: false, delivery: null, notice: null })
  const repository = useMemo(() => createTenantAdministrationHttpRepository({
    baseUrl: '/api',
    getTenantId: () => tenantId,
    authorizedFetch: session.sessionClient.authorizedFetch,
  }), [session.sessionClient, tenantId])

  const load = useCallback(async () => {
    const scope = scopeRef.current.capture()
    if (!canManage) {
      scopeRef.current.commit(scope, () => setState({ status: 'denied', memberships: [], teams: [], error: null }))
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
      scopeRef.current.commit(scope, () => setState(next))
      return next
    } catch (error) {
      scopeRef.current.commit(scope, () => setState({ status: 'error', memberships: [], teams: [], invitations: [], error, mutating: false, delivery: null }))
      throw error
    }
  }, [canManage, canManageTeams, repository, state.delivery])

  useEffect(() => {
    let active = true
    const scope = scopeRef.current.capture()
    if (!canManage) {
      return () => { active = false }
    }
    Promise.all([repository.listMemberships(), canManageTeams ? repository.listTeams() : Promise.resolve([]), repository.listInvitations()])
        .then(([memberships, teams, invitations]) => { if (active) scopeRef.current.commit(scope, () => setState({ status: 'ready', memberships, teams, invitations, error: null, mutating: false, delivery: null })) })
        .catch((error) => { if (active) scopeRef.current.commit(scope, () => setState({ status: 'error', memberships: [], teams: [], invitations: [], error, mutating: false, delivery: null })) })
    return () => { active = false }
  }, [canManage, canManageTeams, repository])

  const mutate = useCallback(async (operation, { deliveryFor, notice } = {}) => {
    const scope = scopeRef.current.capture()
    setState((current) => ({ ...current, mutating: true, error: null }))
    try {
      const result = await operation()
      if (!scopeRef.current.isCurrent(scope)) return false
      const [memberships, teams, invitations] = await Promise.all([repository.listMemberships(), canManageTeams ? repository.listTeams() : Promise.resolve([]), repository.listInvitations()])
      scopeRef.current.commit(scope, () => setState((current) => ({
        status: 'ready',
        memberships,
        teams,
        invitations,
        error: null,
        mutating: false,
        delivery: deliveryFor ? deliveryFor(result) : current.delivery,
        notice: notice ?? null,
      })))
      return true
    } catch (error) {
      scopeRef.current.commit(scope, () => setState((current) => ({ ...current, error, mutating: false })))
      throw error
    }
  }, [canManageTeams, repository])

  const mutateTeam = useCallback((operation, options) => canManageTeams ? mutate(operation, options) : Promise.resolve(false), [canManageTeams, mutate])

  return {
    ...state,
    status: canManage ? state.status : 'denied',
    canManage,
    canManageTeams,
    reload: load,
    createTeam: (name) => mutateTeam(() => repository.createTeam(name), { notice: 'Time criado.' }),
    renameTeam: (teamId, name) => mutateTeam(() => repository.renameTeam(teamId, name), { notice: 'Time renomeado.' }),
    archiveTeam: (teamId) => mutateTeam(() => repository.archiveTeam(teamId), { notice: 'Time arquivado e vínculos ativos encerrados.' }),
    restoreTeam: (teamId) => mutateTeam(() => repository.restoreTeam(teamId), { notice: 'Time restaurado.' }),
    changeMembershipRole: (membershipId, role) => mutateTeam(() => repository.changeMembershipRole(membershipId, role), { notice: 'Papel da pessoa atualizado.' }),
    changeMembershipStatus: (membershipId, action, reason) => mutate(() => repository.changeMembershipStatus(membershipId, action, reason), { notice: 'Situação da pessoa atualizada.' }),
    assignTeamMembership: (teamId, membershipId, role) => mutateTeam(() => repository.assignTeamMembership(teamId, membershipId, role), { notice: 'Pessoa vinculada ao time.' }),
    endTeamMembership: (teamId, membershipId) => mutateTeam(() => repository.endTeamMembership(teamId, membershipId), { notice: 'Vínculo com o time encerrado.' }),
    actorMembershipId: session.membership?.id,
    createInvitation: (input) => mutate(
      () => repository.createInvitation(input),
      { deliveryFor: result => ({ email: result.email, status: result.deliveryStatus }), notice: 'Convite criado.' },
    ),
    resendInvitation: (invitationId) => mutate(
      () => repository.resendInvitation(invitationId),
      { deliveryFor: result => ({ email: result.email, status: result.deliveryStatus }), notice: 'Convite reenviado.' },
    ),
    revokeInvitation: (invitationId) => mutate(() => repository.revokeInvitation(invitationId), { notice: 'Convite revogado.' }),
  }
}
