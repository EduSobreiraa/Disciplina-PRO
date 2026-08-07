import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/app-context'
import { createMissionsHttpRepository } from '../repositories/missions.http.repository'

const EMPTY_METRICS = { perfectDays: 0, perfectStreak: 0, monthPercent: 0, minimumBehaviorPercent: 0, weeklyXp: 0, markedDays: 0, totalGreens: 0, completedRitualSections: 0 }

export function useMissions() {
  const session = useAppContext()
  const [state, setState] = useState({ status: 'loading', metrics: EMPTY_METRICS, error: null })
  const repository = useMemo(() => createMissionsHttpRepository({ baseUrl: '/api', getTenantId: () => session.tenant?.id, authorizedFetch: session.sessionClient.authorizedFetch }), [session.sessionClient, session.tenant?.id])
  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try { const { metrics } = await repository.loadMine(); setState({ status: 'ready', metrics, error: null }); return metrics } catch (error) { setState({ status: 'error', metrics: EMPTY_METRICS, error }); throw error }
  }, [repository])
  useEffect(() => {
    let active = true
    repository.loadMine().then(({ metrics }) => { if (active) setState({ status: 'ready', metrics, error: null }) }).catch((error) => { if (active) setState({ status: 'error', metrics: EMPTY_METRICS, error }) })
    return () => { active = false }
  }, [repository])
  return { ...state, reload: load }
}
