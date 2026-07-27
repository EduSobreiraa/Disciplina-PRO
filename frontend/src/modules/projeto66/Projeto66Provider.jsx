import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../app/providers/app-context'
import { createProjeto66HttpRepository, Projeto66ApiError } from './repositories/projeto66.http.repository'
import { Projeto66Context } from './projeto66-context'
import { PROJETO66_PROGRAM_SLUG } from './data/projeto66-contract'

export function Projeto66Provider({ children }) {
  const session = useAppContext()
  const [state, setState] = useState({ status: 'loading', cycle: null, error: null })

  const repository = useMemo(() => createProjeto66HttpRepository({
    baseUrl: '/api',
    getAccessToken: session.sessionClient.getAccessToken,
    getTenantId: () => session.tenant?.id,
    fetchImplementation: session.sessionClient.authorizedFetch,
  }), [session.sessionClient, session.tenant?.id])

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const enrollments = await repository.listEnrollments()
      const enrollment = enrollments.find(({ program }) => program.slug === PROJETO66_PROGRAM_SLUG)
      if (!enrollment) throw new Error('Projeto 66 não está habilitado para esta organização')
      const cycle = await repository.loadCycle(enrollment.id)
      setState({ status: 'ready', cycle, error: null })
      return cycle
    } catch (error) {
      setState({ status: 'error', cycle: null, error })
      throw error
    }
  }, [repository])

  useEffect(() => {
    let active = true
    repository.listEnrollments()
      .then((enrollments) => {
        const enrollment = enrollments.find(({ program }) => program.slug === PROJETO66_PROGRAM_SLUG)
        if (!enrollment) throw new Error('Projeto 66 não está habilitado para esta organização')
        return repository.loadCycle(enrollment.id)
      })
      .then((cycle) => { if (active) setState({ status: 'ready', cycle, error: null }) })
      .catch((error) => { if (active) setState({ status: 'error', cycle: null, error }) })
    return () => { active = false }
  }, [repository])

  const value = useMemo(() => ({
    ...state,
    async startCycle() {
      const cycle = await repository.startCycle(state.cycle.id)
      setState({ status: 'ready', cycle, error: null })
      return cycle
    },
    async saveDailyRecord(programDay, record) {
      const cycle = await repository.saveDailyRecord(state.cycle.id, record.pillars)
      setState({ status: 'ready', cycle, error: null })
      return cycle
    },
    async saveChecklist(programDay, checklist) {
      const pending = Object.entries(checklist)
        .filter(([key, active]) => active && !state.cycle.checklistByDay[programDay]?.[key])
      let cycle = state.cycle
      for (const [key] of pending) {
        const activity = cycle.activities[key]
        if (!activity) throw new Error(`Atividade ${key} não publicada`)
        cycle = await repository.completeActivity(cycle.id, activity.id)
      }
      setState({ status: 'ready', cycle, error: null })
      return cycle
    },
    async loadPrivateResponse(activityKey) {
      const activity = state.cycle.activities[activityKey]
      if (!activity) throw new Error(`Atividade privada ${activityKey} não publicada`)
      try {
        const response = await repository.loadPrivateResponse(state.cycle.id, activity.id)
        return response.payload
      } catch (error) {
        if (error instanceof Projeto66ApiError && error.status === 404) return null
        throw error
      }
    },
    async savePrivateResponse(activityKey, payload) {
      const activity = state.cycle.activities[activityKey]
      if (!activity) throw new Error(`Atividade privada ${activityKey} não publicada`)
      return repository.savePrivateResponse(state.cycle.id, activity.id, payload)
    },
    reload: load,
  }), [load, repository, state])

  return <Projeto66Context.Provider value={value}>{children}</Projeto66Context.Provider>
}
