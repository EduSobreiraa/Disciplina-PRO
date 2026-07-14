export function getMonthKey(year, month) { return `${year}-${String(month + 1).padStart(2, '0')}` }
export function getMarkKey(year, month, day, behaviorId) { return `${getMonthKey(year, month)}-${String(day).padStart(2, '0')}:${behaviorId}` }

export function calculateTrackerStats(state, year, month) {
  const prefix = `${getMonthKey(year, month)}-`
  const activeIds = new Set(state.behaviors.filter((behavior) => behavior.active).map((behavior) => behavior.id))
  let greens = 0; let reds = 0
  const byBehavior = Object.fromEntries([...activeIds].map((id) => [id, { greens: 0, reds: 0 }]))
  const byDay = {}
  Object.entries(state.marks).forEach(([key, status]) => {
    if (!key.startsWith(prefix)) return
    const behaviorId = key.split(':')[1]
    if (!activeIds.has(behaviorId)) return
    const day = Number(key.slice(prefix.length, prefix.length + 2))
    byDay[day] ??= { greens: 0, reds: 0 }
    if (status === 1) { greens += 1; byBehavior[behaviorId].greens += 1; byDay[day].greens += 1 }
    if (status === 2) { reds += 1; byBehavior[behaviorId].reds += 1; byDay[day].reds += 1 }
  })
  const total = greens + reds
  const behaviorCount = activeIds.size
  const markedDays = Object.keys(byDay).length
  const perfectDays = Object.values(byDay).filter((day) => behaviorCount > 0 && day.greens === behaviorCount && day.reds === 0).length
  return { greens, reds, total, percent: total ? Math.round((greens / total) * 100) : null, markedDays, perfectDays, byBehavior, byDay }
}

export function getScoreClass(percent) {
  if (percent === null) return 'neutral'
  if (percent >= 90) return 'green'
  if (percent >= 75) return 'gold'
  return 'red'
}

export function getBehaviorRanking(behaviors, byBehavior) {
  return behaviors.map((behavior) => {
    const stats = byBehavior[behavior.id] ?? { greens: 0, reds: 0 }
    const total = stats.greens + stats.reds
    return { ...behavior, ...stats, percent: total ? Math.round((stats.greens / total) * 100) : null }
  }).filter((behavior) => behavior.percent !== null)
}
