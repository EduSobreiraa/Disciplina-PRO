import { RITUAL_ITEMS } from '../../ritual/domain/ritual-definition.js'

export interface MissionMetrics {
  perfectDays: number
  perfectStreak: number
  monthPercent: number
  minimumBehaviorPercent: number
  weeklyXp: number
  markedDays: number
  totalGreens: number
  completedRitualSections: number
}

export const EMPTY_MISSION_METRICS: MissionMetrics = {
  perfectDays: 0,
  perfectStreak: 0,
  monthPercent: 0,
  minimumBehaviorPercent: 0,
  weeklyXp: 0,
  markedDays: 0,
  totalGreens: 0,
  completedRitualSections: 0,
}

export function civilDateKey(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function isoWeekKey(dateKey: string) {
  const value = new Date(`${dateKey}T00:00:00.000Z`)
  const day = value.getUTCDay() || 7
  value.setUTCDate(value.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((value.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function calculateMissionMetrics(input: {
  activeBehaviorIds: string[]
  monthMarks: Array<{ behaviorId: string; trackedOn: Date; status: 'COMPLETED' | 'FAILED' }>
  totalGreens: number
  ritualSectionCounts: Array<{ sectionKey: string; count: number }>
  xpTransactions: Array<{ amount: number; occurredAt: Date }>
  today: string
  timeZone: string
}): MissionMetrics {
  const active = new Set(input.activeBehaviorIds)
  const behaviorCounts = new Map(input.activeBehaviorIds.map((id) => [id, { greens: 0, total: 0 }]))
  const days = new Map<string, { greens: number; reds: number }>()

  for (const mark of input.monthMarks) {
    if (!active.has(mark.behaviorId)) continue
    const day = mark.trackedOn.toISOString().slice(0, 10)
    const dayCounts = days.get(day) ?? { greens: 0, reds: 0 }
    const behavior = behaviorCounts.get(mark.behaviorId)!
    behavior.total += 1
    if (mark.status === 'COMPLETED') {
      dayCounts.greens += 1
      behavior.greens += 1
    } else dayCounts.reds += 1
    days.set(day, dayCounts)
  }

  const perfectDates = [...days.entries()]
    .filter(([, counts]) => active.size > 0 && counts.greens === active.size && counts.reds === 0)
    .map(([date]) => date)
    .sort()
  let perfectStreak = 0
  let currentStreak = 0
  let previous: Date | null = null
  for (const date of perfectDates) {
    const current = new Date(`${date}T00:00:00.000Z`)
    currentStreak = previous && current.getTime() - previous.getTime() === 86_400_000 ? currentStreak + 1 : 1
    perfectStreak = Math.max(perfectStreak, currentStreak)
    previous = current
  }

  const greens = [...days.values()].reduce((sum, item) => sum + item.greens, 0)
  const reds = [...days.values()].reduce((sum, item) => sum + item.reds, 0)
  const percentages = [...behaviorCounts.values()].map(({ greens: count, total }) => total ? Math.round(count / total * 100) : 0)
  const currentWeek = isoWeekKey(input.today)

  return {
    perfectDays: perfectDates.length,
    perfectStreak,
    monthPercent: greens + reds ? Math.round(greens / (greens + reds) * 100) : 0,
    minimumBehaviorPercent: percentages.length ? Math.min(...percentages) : 0,
    weeklyXp: input.xpTransactions
      .filter(({ amount, occurredAt }) => amount > 0 && isoWeekKey(civilDateKey(occurredAt, input.timeZone)) === currentWeek)
      .reduce((sum, { amount }) => sum + amount, 0),
    markedDays: days.size,
    totalGreens: input.totalGreens,
    completedRitualSections: input.ritualSectionCounts.filter(({ sectionKey, count }) => {
      const items = RITUAL_ITEMS[sectionKey as keyof typeof RITUAL_ITEMS]
      return items && count === items.length
    }).length,
  }
}
