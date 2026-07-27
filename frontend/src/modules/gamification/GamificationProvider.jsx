import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../app/providers/app-context'
import { achievementDefinitions, levelPresentation } from './data/gamification-rules'
import { GamificationContext } from './gamification-context'
import { createGamificationHttpRepository } from './repositories/gamification.http.repository'

const emptyProjection = {
  balance: 0,
  level: { level: 1, key: 'recruit', name: 'Recruta', minimum: 0 },
  nextLevel: { level: 2, key: 'soldier', name: 'Soldado', minimum: 500 },
  progress: 0,
  transactions: [],
  achievements: [],
}

export function GamificationProvider({ children }) {
  const session = useAppContext()
  const [state, setState] = useState({ status: 'idle', projection: emptyProjection, error: null })
  const repository = useMemo(() => createGamificationHttpRepository({
    baseUrl: '/api',
    getTenantId: () => session.tenant?.id,
    authorizedFetch: session.sessionClient.authorizedFetch,
  }), [session.sessionClient, session.tenant?.id])

  const reload = useCallback(async () => {
    if (!session.authenticated || !session.tenant) {
      setState({ status: 'idle', projection: emptyProjection, error: null })
      return emptyProjection
    }
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const projection = await repository.loadMine()
      setState({ status: 'ready', projection, error: null })
      return projection
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error }))
      throw error
    }
  }, [repository, session.authenticated, session.tenant])

  useEffect(() => {
    let active = true
    if (!session.authenticated || !session.tenant) {
      setState({ status: 'idle', projection: emptyProjection, error: null })
      return () => { active = false }
    }
    setState((current) => ({ ...current, status: 'loading', error: null }))
    const refresh = () => repository.loadMine()
      .then((projection) => { if (active) setState({ status: 'ready', projection, error: null }) })
      .catch((error) => { if (active) setState((current) => ({ ...current, status: 'error', error })) })
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [repository, session.authenticated, session.tenant])

  const value = useMemo(() => {
    const projection = state.projection
    return {
      status: state.status,
      error: state.error,
      xp: projection.balance,
      level: { ...projection.level, ...(levelPresentation[projection.level.key] ?? { medal: '🏅' }) },
      nextLevel: projection.nextLevel,
      progress: projection.progress,
      transactions: projection.transactions,
      achievements: projection.achievements,
      achievementDefinitions,
      reload,
    }
  }, [reload, state])
  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>
}
