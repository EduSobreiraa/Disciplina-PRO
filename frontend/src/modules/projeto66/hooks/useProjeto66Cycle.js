import { useMemo, useState } from 'react'
import { projeto66LocalRepository } from '../repositories/projeto66.local.repository'
import { getBestStreak, getCurrentProgramDay, getCurrentStreak, getPhaseProgress, getProgressPercent } from '../services/progress'
import { getScoreStats } from '../services/scoring'
import { useGamification } from '../../gamification/gamification-context'

export function useProjeto66Cycle() {
  const gamification = useGamification()
  const [cycle, setCycle] = useState(() => projeto66LocalRepository.loadCycle())
  const metrics = useMemo(() => {
    const currentDay = getCurrentProgramDay(cycle.startedAt)
    return {
      currentDay,
      progress: getProgressPercent(cycle.completedDays),
      currentStreak: getCurrentStreak(cycle.completedDays, currentDay || undefined),
      bestStreak: getBestStreak(cycle.completedDays),
      phaseProgress: getPhaseProgress(cycle.completedDays),
      scoreStats: getScoreStats(cycle.dailyRecords),
    }
  }, [cycle])

  function startCycle() {
    const next = { ...cycle, status: 'ACTIVE', startedAt: new Date().toISOString() }
    projeto66LocalRepository.saveCycle(next)
    setCycle(next)
  }

  function saveDailyRecord(programDay, record) {
    gamification.setReward('PROJECT_DAY', `projeto66:day:${programDay}`, true)
    const next = projeto66LocalRepository.saveDailyRecord(programDay, record)
    setCycle(next)
    return next
  }

  function saveChecklist(programDay, checklist) {
    const previous = cycle.checklistByDay[programDay] ?? {}
    for (const [itemKey, active] of Object.entries(checklist)) {
      if (Boolean(previous[itemKey]) !== Boolean(active)) gamification.setReward('PROJECT_ACTIVITY', `projeto66:checklist:${programDay}:${itemKey}`, Boolean(active))
    }
    const next = projeto66LocalRepository.saveChecklist(programDay, checklist)
    setCycle(next)
  }

  function resetChecklist(programDay) {
    for (const [itemKey, active] of Object.entries(cycle.checklistByDay[programDay] ?? {})) {
      if (active) gamification.setReward('PROJECT_ACTIVITY', `projeto66:checklist:${programDay}:${itemKey}`, false)
    }
    const next = projeto66LocalRepository.resetChecklist(programDay)
    setCycle(next)
  }

  return { cycle, ...metrics, startCycle, saveDailyRecord, saveChecklist, resetChecklist }
}
