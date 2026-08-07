import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/app-context'
import { createPlatformAdministrationHttpRepository } from '../repositories/platform-administration.http.repository'

export function usePlatformAdministration() {
  const session = useAppContext()
  const allowed = session.platformAccess?.role === 'SUPER_ADMIN'
  const [state, setState] = useState({ status: 'loading', tenants: [], programs: [], error: null, mutating: false, delivery: null })
  const repository = useMemo(() => createPlatformAdministrationHttpRepository({ authorizedFetch: session.sessionClient.authorizedFetch }), [session.sessionClient])

  const fetchProjection = useCallback(() => Promise.all([repository.listTenants(), repository.listPrograms()]), [repository])
  const reload = useCallback(async () => {
    if (!allowed) return null
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const [tenants, programs] = await fetchProjection()
      setState((current) => ({ ...current, status: 'ready', tenants, programs, error: null, mutating: false }))
      return { tenants, programs }
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error, mutating: false }))
      throw error
    }
  }, [allowed, fetchProjection])

  useEffect(() => {
    let active = true
    if (!allowed) return () => { active = false }
    fetchProjection().then(([tenants, programs]) => {
      if (active) setState({ status: 'ready', tenants, programs, error: null, mutating: false, delivery: null })
    }).catch((error) => {
      if (active) setState((current) => ({ ...current, status: 'error', error, mutating: false }))
    })
    return () => { active = false }
  }, [allowed, fetchProjection])

  const mutate = useCallback(async (operation) => {
    setState((current) => ({ ...current, mutating: true, error: null }))
    try {
      const result = await operation()
      const [tenants, programs] = await fetchProjection()
      setState((current) => ({ ...current, status: 'ready', tenants, programs, error: null, mutating: false }))
      return result
    } catch (error) {
      setState((current) => ({ ...current, error, mutating: false }))
      throw error
    }
  }, [fetchProjection])

  return {
    ...state,
    allowed,
    reload,
    createTenant: (input) => mutate(() => repository.createTenant(input)),
    transitionTenant: (tenantId, action, reason) => mutate(() => repository.transitionTenant(tenantId, action, reason)),
    inviteFirstCeo: (tenantId, email) => mutate(async () => {
      const result = await repository.inviteFirstCeo(tenantId, email)
      setState((current) => ({ ...current, delivery: { email: result.email, status: result.deliveryStatus } }))
      return result
    }),
    setProgramEnabled: (tenantId, programId, enabled) => mutate(() => repository.setProgramEnabled(tenantId, programId, enabled)),
  }
}
