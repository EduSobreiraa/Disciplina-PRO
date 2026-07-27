import { useCallback, useEffect, useMemo, useState } from 'react'
import { createSessionClient } from '../../modules/auth/session.client'
import { AppContext } from './app-context'

const sessionClient = createSessionClient({
  baseUrl: '/api',
})

function selectedOrganization(context, currentTenantId) {
  return context.organizations.find(({ tenant }) => tenant.id === currentTenantId)
    ?? context.organizations[0]
    ?? null
}

export function AppProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    context: null,
    selectedTenantId: null,
    error: null,
  })

  const acceptContext = useCallback((context, selectedTenantId = null) => {
    const organization = selectedOrganization(context, selectedTenantId)
    setState({
      status: 'authenticated',
      context,
      selectedTenantId: organization?.tenant.id ?? null,
      error: null,
    })
    return context
  }, [])

  useEffect(() => {
    let active = true
    sessionClient.restore()
      .then(() => sessionClient.context())
      .then((context) => { if (active) acceptContext(context) })
      .catch(() => {
        if (active) setState({ status: 'anonymous', context: null, selectedTenantId: null, error: null })
      })
    return () => { active = false }
  }, [acceptContext])

  const value = useMemo(() => {
    const organization = state.context ? selectedOrganization(state.context, state.selectedTenantId) : null
    return {
      status: state.status,
      authenticated: state.status === 'authenticated',
      user: state.context?.user ?? null,
      organizations: state.context?.organizations ?? [],
      tenant: organization?.tenant ?? null,
      membership: organization?.membership ?? null,
      platformAccess: state.context?.platformAccess ?? null,
      error: state.error,
      sessionClient,
      async login(email, password) {
        try {
          await sessionClient.login(email, password)
          return acceptContext(await sessionClient.context())
        } catch (error) {
          setState({ status: 'anonymous', context: null, selectedTenantId: null, error })
          throw error
        }
      },
      async logout() {
        await sessionClient.logout()
        setState({ status: 'anonymous', context: null, selectedTenantId: null, error: null })
      },
      selectTenant(tenantId) {
        if (!state.context?.organizations.some(({ tenant }) => tenant.id === tenantId)) return false
        setState((current) => ({ ...current, selectedTenantId: tenantId }))
        return true
      },
    }
  }, [acceptContext, state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
