import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/app-context'
import { createProgramCatalogHttpRepository } from '../repositories/program-catalog.http.repository'

export function useProgramCatalog() {
  const session = useAppContext()
  const [state, setState] = useState({ status: 'loading', programs: [], error: null })
  const repository = useMemo(() => createProgramCatalogHttpRepository({
    baseUrl: '/api',
    getTenantId: () => session.tenant?.id,
    authorizedFetch: session.sessionClient.authorizedFetch,
  }), [session.sessionClient, session.tenant?.id])

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const programs = await repository.list()
      setState({ status: 'ready', programs, error: null })
      return programs
    } catch (error) {
      setState({ status: 'error', programs: [], error })
      throw error
    }
  }, [repository])

  useEffect(() => {
    let active = true
    repository.list()
      .then((programs) => { if (active) setState({ status: 'ready', programs, error: null }) })
      .catch((error) => { if (active) setState({ status: 'error', programs: [], error }) })
    return () => { active = false }
  }, [repository])

  return { ...state, reload: load }
}
