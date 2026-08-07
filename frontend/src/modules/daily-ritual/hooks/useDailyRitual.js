import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../../../app/providers/app-context'
import { TIMER_SECONDS, ritualSections } from '../data/ritual-content'
import { createDailyRitualHttpRepository, getDateKeyInTimeZone, mapRitualDay } from '../repositories/daily-ritual.http.repository'
import { getRitualProgress } from '../services/ritual-progress'

const emptyDay = () => ({ checks: {}, timer: { completedCycles: 0, remainingSeconds: TIMER_SECONDS, runningStartedAt: null, runningUntil: null } })

export function useDailyRitual() {
  const session = useAppContext()
  const timeZone = session.tenant?.timeZone ?? 'UTC'
  const [dateKey, setDateKey] = useState(() => getDateKeyInTimeZone(timeZone))
  const [view, setView] = useState({ status: 'loading', day: emptyDay(), error: null, mutating: false })
  const [clock, setClock] = useState(Date.now())
  const settling = useRef(false)
  const nextSettleAttempt = useRef(0)
  const repository = useMemo(() => createDailyRitualHttpRepository({
    baseUrl: '/api',
    getTenantId: () => session.tenant?.id,
    authorizedFetch: session.sessionClient.authorizedFetch,
  }), [session.sessionClient, session.tenant?.id])

  useEffect(() => {
    const updateDate = () => setDateKey(getDateKeyInTimeZone(timeZone))
    updateDate()
    const interval = window.setInterval(updateDate, 60_000)
    return () => window.clearInterval(interval)
  }, [timeZone])

  const load = useCallback(async () => {
    setView((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const day = mapRitualDay(await repository.load(dateKey), ritualSections)
      setView({ status: 'ready', day, error: null, mutating: false })
      return day
    } catch (error) {
      setView((current) => ({ ...current, status: 'error', error, mutating: false }))
      throw error
    }
  }, [dateKey, repository])

  useEffect(() => {
    let active = true
    setView({ status: 'loading', day: emptyDay(), error: null, mutating: false })
    repository.load(dateKey)
      .then((day) => { if (active) setView({ status: 'ready', day: mapRitualDay(day, ritualSections), error: null, mutating: false }) })
      .catch((error) => { if (active) setView((current) => ({ ...current, status: 'error', error, mutating: false })) })
    return () => { active = false }
  }, [dateKey, repository])

  const runningUntil = view.day.timer.runningUntil ? new Date(view.day.timer.runningUntil).getTime() : null
  useEffect(() => {
    if (!runningUntil) {
      nextSettleAttempt.current = 0
      return undefined
    }
    const interval = window.setInterval(() => {
      const now = Date.now()
      setClock(now)
      if (now < runningUntil || now < nextSettleAttempt.current || settling.current) return
      settling.current = true
      nextSettleAttempt.current = now + 5_000
      repository.load(dateKey)
        .then((day) => setView({ status: 'ready', day: mapRitualDay(day, ritualSections), error: null, mutating: false }))
        .catch((error) => setView((current) => ({ ...current, status: 'error', error, mutating: false })))
        .finally(() => { settling.current = false })
    }, 250)
    return () => window.clearInterval(interval)
  }, [dateKey, repository, runningUntil])

  const mutate = useCallback(async (operation) => {
    setView((current) => ({ ...current, mutating: true, error: null }))
    try {
      const day = mapRitualDay(await operation(), ritualSections)
      setView({ status: 'ready', day, error: null, mutating: false })
      setClock(Date.now())
      return day
    } catch (error) {
      setView((current) => ({ ...current, status: 'error', error, mutating: false }))
      throw error
    }
  }, [])

  const timer = view.day.timer
  const running = Boolean(runningUntil)
  const remainingSeconds = running ? Math.max(0, Math.ceil((runningUntil - clock) / 1000)) : timer.remainingSeconds
  const progress = useMemo(() => getRitualProgress(ritualSections, view.day.checks), [view.day.checks])

  return {
    ...view,
    dateKey,
    checks: view.day.checks,
    timer: { ...timer, remainingSeconds, running },
    progress,
    reload: load,
    toggleCheck: (sectionKey, itemKey, index) => mutate(() => repository.setCheck(dateKey, sectionKey, itemKey, !view.day.checks[sectionKey]?.[index])),
    toggleTimer: () => mutate(() => repository.changeTimer(dateKey, running ? 'pause' : 'start')),
    resetTimer: () => mutate(() => repository.changeTimer(dateKey, 'reset')),
  }
}
