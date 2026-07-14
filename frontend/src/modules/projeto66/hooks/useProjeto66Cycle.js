import { useMemo, useState } from 'react'
import { projeto66LocalRepository } from '../repositories/projeto66.local.repository'
import { getBestStreak, getCurrentProgramDay, getCurrentStreak, getPhaseProgress, getProgressPercent } from '../services/progress'
import { getScoreStats } from '../services/scoring'

export function useProjeto66Cycle() {
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
    const next = projeto66LocalRepository.saveDailyRecord(programDay, record)
    setCycle(next)
    return next
  }

  function saveChecklist(programDay, checklist) {
    const next = projeto66LocalRepository.saveChecklist(programDay, checklist)
    setCycle(next)
  }

  function resetChecklist(programDay) {
    const next = projeto66LocalRepository.resetChecklist(programDay)
    setCycle(next)
  }

  return { cycle, ...metrics, startCycle, saveDailyRecord, saveChecklist, resetChecklist }
}
