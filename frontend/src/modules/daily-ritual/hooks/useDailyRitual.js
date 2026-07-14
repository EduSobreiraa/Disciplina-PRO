import { useCallback, useEffect, useMemo, useState } from 'react'
import { TIMER_SECONDS, TOTAL_CYCLES, ritualSections } from '../data/ritual-content'
import { dailyRitualLocalRepository, getLocalDateKey } from '../repositories/daily-ritual.local.repository'
import { getRitualProgress } from '../services/ritual-progress'
import { useGamification } from '../../gamification/gamification-context'

const emptyDay = () => ({ checks: {}, timer: { completedCycles: 0, remainingSeconds: TIMER_SECONDS, runningUntil: null } })

export function useDailyRitual() {
  const { setReward } = useGamification()
  const dateKey = getLocalDateKey()
  const [state, setState] = useState(() => dailyRitualLocalRepository.load())
  const [clock, setClock] = useState(0)
  const day = state.days[dateKey] ?? emptyDay()
  const timer = day.timer ?? emptyDay().timer
  const running = Boolean(timer.runningUntil)
  const remainingSeconds = running && clock ? Math.max(0, Math.ceil((timer.runningUntil - clock) / 1000)) : timer.remainingSeconds

  const updateDay = useCallback((updater) => {
    setState((current) => {
      const currentDay = current.days[dateKey] ?? emptyDay()
      const next = { ...current, days: { ...current.days, [dateKey]: updater(currentDay) } }
      return dailyRitualLocalRepository.save(next)
    })
  }, [dateKey])

  useEffect(() => {
    if (!running) return undefined
    const interval = window.setInterval(() => {
      const now = Date.now()
      if (now < timer.runningUntil) { setClock(now); return }
      setReward('FOCUS_CYCLE', `focus:${dateKey}:${timer.completedCycles + 1}`, true)
      updateDay((current) => ({ ...current, timer: { completedCycles: Math.min(TOTAL_CYCLES, timer.completedCycles + 1), remainingSeconds: timer.completedCycles + 1 >= TOTAL_CYCLES ? 0 : TIMER_SECONDS, runningUntil: null } }))
    }, 250)
    return () => window.clearInterval(interval)
  }, [dateKey, running, setReward, timer.completedCycles, timer.runningUntil, updateDay])

  function toggleCheck(sectionKey, index) {
    const nextActive = !day.checks[sectionKey]?.[index]
    const section = ritualSections.find((item) => item.key === sectionKey)
    const nextSectionChecks = { ...day.checks[sectionKey], [index]: nextActive }
    const sectionComplete = section.items.every((_, itemIndex) => nextSectionChecks[itemIndex])
    setReward('RITUAL_STEP', `ritual:${dateKey}:${sectionKey}:${index}`, nextActive)
    setReward('RITUAL_SECTION', `ritual-section:${dateKey}:${sectionKey}`, sectionComplete)
    updateDay((current) => ({ ...current, checks: { ...current.checks, [sectionKey]: nextSectionChecks } }))
  }

  function toggleTimer() {
    if (timer.completedCycles >= TOTAL_CYCLES) return
    updateDay((current) => ({ ...current, timer: running
      ? { ...timer, remainingSeconds, runningUntil: null }
      : { ...timer, runningUntil: Date.now() + timer.remainingSeconds * 1000 } }))
    setClock(Date.now())
  }

  function resetTimer() {
    for (let cycle = 1; cycle <= timer.completedCycles; cycle += 1) setReward('FOCUS_CYCLE', `focus:${dateKey}:${cycle}`, false)
    updateDay((current) => ({ ...current, timer: emptyDay().timer }))
    setClock(Date.now())
  }

  const progress = useMemo(() => getRitualProgress(ritualSections, day.checks), [day.checks])
  return { dateKey, checks: day.checks, timer: { ...timer, remainingSeconds, running }, progress, toggleCheck, toggleTimer, resetTimer }
}
