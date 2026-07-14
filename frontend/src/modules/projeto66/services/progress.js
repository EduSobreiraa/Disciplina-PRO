const DAY_MS = 86_400_000
export const PROGRAM_LENGTH = 66

export function normalizeCompletedDays(days = []) {
  return [...new Set(days.map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= PROGRAM_LENGTH))].sort((a, b) => a - b)
}

export function getPhaseForDay(day) {
  if (day <= 22) return 1
  if (day <= 44) return 2
  return 3
}

export function getCurrentProgramDay(startedAt, pausedDays = 0, now = new Date()) {
  if (!startedAt) return 0
  const startDay = new Date(startedAt)
  const currentDay = new Date(now)
  startDay.setHours(0, 0, 0, 0)
  currentDay.setHours(0, 0, 0, 0)
  const elapsed = Math.floor((currentDay.getTime() - startDay.getTime()) / DAY_MS) + 1 - pausedDays
  return Math.max(1, Math.min(PROGRAM_LENGTH, elapsed))
}

export function getProgressPercent(completedDays = []) {
  return Math.round((normalizeCompletedDays(completedDays).length / PROGRAM_LENGTH) * 100)
}

export function getCurrentStreak(completedDays = [], referenceDay) {
  const days = normalizeCompletedDays(completedDays)
  if (!days.length) return 0
  const completed = new Set(days)
  let cursor = referenceDay ?? days.at(-1)
  let streak = 0
  while (completed.has(cursor)) {
    streak += 1
    cursor -= 1
  }
  return streak
}

export function getBestStreak(completedDays = []) {
  const days = normalizeCompletedDays(completedDays)
  let best = 0
  let current = 0
  let previous = null
  days.forEach((day) => {
    current = previous === day - 1 ? current + 1 : 1
    best = Math.max(best, current)
    previous = day
  })
  return best
}

export function getPhaseProgress(completedDays = []) {
  const completed = new Set(normalizeCompletedDays(completedDays))
  return [
    { phase: 1, completed: countRange(completed, 1, 22), total: 22 },
    { phase: 2, completed: countRange(completed, 23, 44), total: 22 },
    { phase: 3, completed: countRange(completed, 45, 66), total: 22 },
  ].map((item) => ({ ...item, percent: Math.round((item.completed / item.total) * 100) }))
}

function countRange(completed, start, end) {
  let count = 0
  for (let day = start; day <= end; day += 1) if (completed.has(day)) count += 1
  return count
}
