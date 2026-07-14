export function getMonthKey(year, month) { return `${year}-${String(month + 1).padStart(2, '0')}` }
export function getMarkKey(year, month, day, behaviorId) { return `${getMonthKey(year, month)}-${String(day).padStart(2, '0')}:${behaviorId}` }

export function calculateTrackerStats(state, year, month) {
  const prefix = `${getMonthKey(year, month)}-`
  const activeIds = new Set(state.behaviors.filter((behavior) => behavior.active).map((behavior) => behavior.id))
  let greens = 0; let reds = 0
  const byBehavior = Object.fromEntries([...activeIds].map((id) => [id, { greens: 0, reds: 0 }]))
  Object.entries(state.marks).forEach(([key, status]) => {
    if (!key.startsWith(prefix)) return
    const behaviorId = key.split(':')[1]
    if (!activeIds.has(behaviorId)) return
    if (status === 1) { greens += 1; byBehavior[behaviorId].greens += 1 }
    if (status === 2) { reds += 1; byBehavior[behaviorId].reds += 1 }
  })
  const total = greens + reds
  return { greens, reds, total, percent: total ? Math.round((greens / total) * 100) : null, byBehavior }
}

export function getScoreClass(percent) {
  if (percent === null) return 'neutral'
  if (percent >= 90) return 'green'
  if (percent >= 75) return 'gold'
  return 'red'
}
