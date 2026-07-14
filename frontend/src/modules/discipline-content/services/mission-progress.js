import { getRitualProgress } from '../../daily-ritual/services/ritual-progress.js'

export function getPerfectStreak(byDay, behaviorCount) {
  return Object.keys(byDay).map(Number).sort((a, b) => a - b).reduce((result, day) => {
    const perfect = behaviorCount > 0 && byDay[day].greens === behaviorCount && byDay[day].reds === 0
    const consecutive = perfect && result.previous === day - 1 ? result.current + 1 : perfect ? 1 : 0
    return { current: consecutive, best: Math.max(result.best, consecutive), previous: day }
  }, { current: 0, best: 0, previous: 0 }).best
}

export function getWeekKey(date = new Date()) {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = value.getUTCDay() || 7
  value.setUTCDate(value.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((value - yearStart) / 86400000) + 1) / 7)
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function calculateMissionMetrics({ trackerState, trackerStats, ritualState, ritualSections, transactions, now = new Date() }) {
  const activeBehaviors = trackerState.behaviors.filter((item) => item.active)
  const percentages = activeBehaviors.map((item) => trackerStats.byBehavior[item.id]).filter(Boolean).map((stats) => stats.greens + stats.reds ? Math.round(stats.greens / (stats.greens + stats.reds) * 100) : 0)
  const weekKey = getWeekKey(now)
  return {
    perfectDays: trackerStats.perfectDays,
    perfectStreak: getPerfectStreak(trackerStats.byDay, activeBehaviors.length),
    monthPercent: trackerStats.percent ?? 0,
    minimumBehaviorPercent: percentages.length ? Math.min(...percentages) : 0,
    weeklyXp: transactions.filter((item) => item.amount > 0 && getWeekKey(new Date(item.occurredAt)) === weekKey).reduce((sum, item) => sum + item.amount, 0),
    markedDays: trackerStats.markedDays,
    totalGreens: Object.values(trackerState.marks).filter((status) => status === 1).length,
    completedRitualSections: Object.values(ritualState.days).reduce((total, day) => total + ritualSections.filter((section) => getRitualProgress([section], day.checks).complete).length, 0),
  }
}

export function getMissionPeriodKey(period, date = new Date()) {
  if (period === 'week') return getWeekKey(date)
  if (period === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  return 'lifetime'
}
