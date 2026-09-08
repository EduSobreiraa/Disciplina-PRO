import { useMemo } from 'react'
import { useProjeto66Context } from '../projeto66-context'
import { PROGRAM_LENGTH, getBestStreak, getCurrentStreak, getPhaseProgress, getProgressPercent } from '../services/progress'
import { getScoreStats } from '../services/scoring'

export function useProjeto66Cycle() {
  const remote = useProjeto66Context()
  const metrics = useMemo(() => {
    const currentDay = remote.cycle?.currentDay ?? 0
    const completedDays = remote.cycle?.completedDays ?? []
    const dailyRecords = remote.cycle?.dailyRecords ?? {}
    const durationDays = remote.cycle?.durationDays || PROGRAM_LENGTH
    return {
      durationDays,
      currentDay,
      progress: getProgressPercent(completedDays, durationDays),
      currentStreak: getCurrentStreak(completedDays, currentDay || undefined, durationDays),
      bestStreak: getBestStreak(completedDays, durationDays),
      phaseProgress: getPhaseProgress(completedDays, durationDays),
      scoreStats: getScoreStats(dailyRecords),
    }
  }, [remote.cycle])
  return { ...remote, ...metrics }
}
