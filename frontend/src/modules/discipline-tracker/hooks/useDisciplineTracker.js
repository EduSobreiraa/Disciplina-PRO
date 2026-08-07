import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/app-context'
import { createDisciplineTrackerHttpRepository } from '../repositories/discipline-tracker.http.repository'
import { calculateTrackerStats, getMarkKey } from '../services/tracker-stats'

const emptyState = { behaviors: [], marks: {}, justifications: {} }

export function useDisciplineTracker(year, month) {
  const session = useAppContext()
  const [view, setView] = useState({ status: 'loading', state: emptyState, error: null, mutating: false })
  const repository = useMemo(() => createDisciplineTrackerHttpRepository({
    baseUrl: '/api',
    getTenantId: () => session.tenant?.id,
    authorizedFetch: session.sessionClient.authorizedFetch,
  }), [session.sessionClient, session.tenant?.id])
  const stats = useMemo(() => calculateTrackerStats(view.state, year, month), [view.state, year, month])

  const load = useCallback(async () => {
    setView((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const state = await repository.load(year, month)
      setView({ status: 'ready', state, error: null, mutating: false })
      return state
    } catch (error) {
      setView((current) => ({ ...current, status: 'error', error, mutating: false }))
      throw error
    }
  }, [month, repository, year])

  useEffect(() => {
    let active = true
    setView({ status: 'loading', state: emptyState, error: null, mutating: false })
    repository.load(year, month)
      .then((state) => { if (active) setView({ status: 'ready', state, error: null, mutating: false }) })
      .catch((error) => { if (active) setView((current) => ({ ...current, status: 'error', error, mutating: false })) })
    return () => { active = false }
  }, [month, repository, year])

  const mutate = useCallback(async (operation) => {
    setView((current) => ({ ...current, mutating: true, error: null }))
    try {
      await operation()
      const state = await repository.load(year, month)
      setView({ status: 'ready', state, error: null, mutating: false })
      return state
    } catch (error) {
      setView((current) => ({ ...current, status: 'error', error, mutating: false }))
      throw error
    }
  }, [month, repository, year])

  async function cycleMark(day, behaviorId) {
    const key = getMarkKey(year, month, day, behaviorId)
    const current = view.state.marks[key] ?? 0
    const nextStatus = (current + 1) % 3
    const date = key.slice(0, 10)
    await mutate(() => nextStatus === 0
      ? repository.deleteMark(behaviorId, date)
      : repository.putMark(behaviorId, date, nextStatus === 1 ? 'COMPLETED' : 'FAILED'))
    return { key, status: nextStatus }
  }

  return {
    ...view,
    stats,
    reload: load,
    cycleMark,
    saveJustification: (key, text) => mutate(() => repository.putJustification(key.slice(11), key.slice(0, 10), text)),
    addBehavior: (name) => mutate(() => repository.createBehavior(name)),
    renameBehavior: (id, name) => mutate(() => repository.renameBehavior(id, name)),
    removeBehavior: (id) => mutate(() => repository.archiveBehavior(id)),
    exportBackup: () => repository.exportBackup(),
    restoreBackup: (backup) => mutate(() => repository.restoreBackup(backup)),
  }
}
