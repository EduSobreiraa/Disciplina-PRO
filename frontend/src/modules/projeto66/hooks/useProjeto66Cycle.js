import { useMemo } from 'react'
import { useProjeto66Context } from '../projeto66-context'
import { getBestStreak, getCurrentStreak, getPhaseProgress, getProgressPercent } from '../services/progress'
import { getScoreStats } from '../services/scoring'

export function useProjeto66Cycle() {
  const remote = useProjeto66Context()
  const metrics = useMemo(() => {
    const currentDay = remote.cycle?.currentDay ?? 0
    const completedDays = remote.cycle?.completedDays ?? []
    const dailyRecords = remote.cycle?.dailyRecords ?? {}
    return {
      currentDay,
      progress: getProgressPercent(completedDays),
      currentStreak: getCurrentStreak(completedDays, currentDay || undefined),
      bestStreak: getBestStreak(completedDays),
      phaseProgress: getPhaseProgress(completedDays),
      scoreStats: getScoreStats(dailyRecords),
    }
  }, [remote.cycle])
  return { ...remote, ...metrics }
}
