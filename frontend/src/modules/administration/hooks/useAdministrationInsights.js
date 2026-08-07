import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/app-context'
import { createTenantAdministrationHttpRepository } from '../repositories/tenant-administration.http.repository'

export function useAdministrationInsights({ canManageTeams, teams, memberships, actorMembershipId }) {
  const session = useAppContext()
  const availableTeams = useMemo(() => {
    if (canManageTeams) return teams.filter(({ archivedAt }) => !archivedAt)
    const actor = memberships.find(({ id }) => id === actorMembershipId)
    return (actor?.teams ?? []).filter(({ role }) => role === 'MANAGER').map(({ team }) => team)
  }, [actorMembershipId, canManageTeams, memberships, teams])
  const [scope, setScope] = useState(() => canManageTeams ? 'tenant' : availableTeams[0]?.id ?? '')
  const [state, setState] = useState({ status: 'loading', report: null, audit: null, error: null })
  const repository = useMemo(() => createTenantAdministrationHttpRepository({
    baseUrl: '/api',
    getTenantId: () => session.tenant?.id,
    authorizedFetch: session.sessionClient.authorizedFetch,
  }), [session.sessionClient, session.tenant?.id])

  const load = useCallback(async () => {
    const effectiveScope = scope || availableTeams[0]?.id
    if (!effectiveScope) {
      setState({ status: 'empty', report: null, audit: null, error: null })
      return null
    }
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const [report, audit] = effectiveScope === 'tenant'
        ? await Promise.all([repository.getTenantReport(), repository.getTenantAudit()])
        : await Promise.all([repository.getTeamReport(effectiveScope), repository.getTeamAudit(effectiveScope)])
      const next = { status: 'ready', report, audit, error: null }
      setState(next)
      return next
    } catch (error) {
      setState({ status: 'error', report: null, audit: null, error })
      throw error
    }
  }, [availableTeams, repository, scope])

  useEffect(() => {
    let active = true
    const effectiveScope = scope || availableTeams[0]?.id
    if (!effectiveScope) {
      Promise.resolve().then(() => { if (active) setState({ status: 'empty', report: null, audit: null, error: null }) })
      return () => { active = false }
    }
    const reads = effectiveScope === 'tenant'
      ? [repository.getTenantReport(), repository.getTenantAudit()]
      : [repository.getTeamReport(effectiveScope), repository.getTeamAudit(effectiveScope)]
    Promise.all(reads)
      .then(([report, audit]) => { if (active) setState({ status: 'ready', report, audit, error: null }) })
      .catch((error) => { if (active) setState({ status: 'error', report: null, audit: null, error }) })
    return () => { active = false }
  }, [availableTeams, repository, scope])

  return { ...state, scope: scope || availableTeams[0]?.id || '', setScope, availableTeams, reload: load }
}
