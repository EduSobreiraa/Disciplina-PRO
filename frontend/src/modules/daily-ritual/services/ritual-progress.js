export function getSectionProgress(items, checks = {}) {
  const completed = items.reduce((total, _, index) => total + Number(Boolean(checks[index])), 0)
  return { completed, total: items.length, percent: items.length ? Math.round(completed / items.length * 100) : 0, complete: completed === items.length }
}

export function getRitualProgress(sections, checks = {}) {
  const total = sections.reduce((sum, section) => sum + section.items.length, 0)
  const completed = sections.reduce((sum, section) => sum + getSectionProgress(section.items, checks[section.key]).completed, 0)
  return { completed, total, percent: total ? Math.round(completed / total * 100) : 0, complete: total > 0 && completed === total }
}

export function normalizeTimer(timer, now = Date.now(), cycleSeconds = 1800, totalCycles = 8) {
  const base = { completedCycles: 0, remainingSeconds: cycleSeconds, runningUntil: null }
  const current = { ...base, ...timer }
  if (!current.runningUntil) return current
  const elapsed = Math.max(0, Math.floor((now - (current.startedAt ?? now)) / 1000))
  const starting = current.remainingSeconds ?? cycleSeconds
  const consumedCycles = Math.min(totalCycles - current.completedCycles, Math.floor(Math.max(0, elapsed - starting) / cycleSeconds) + Number(elapsed >= starting))
  const completedCycles = Math.min(totalCycles, current.completedCycles + consumedCycles)
  if (completedCycles >= totalCycles) return { completedCycles, remainingSeconds: 0, runningUntil: null }
  const secondsIntoNext = elapsed < starting ? elapsed : (elapsed - starting) % cycleSeconds
  const remainingSeconds = elapsed < starting ? starting - elapsed : cycleSeconds - secondsIntoNext
  return { completedCycles, remainingSeconds, runningUntil: current.runningUntil, startedAt: now - secondsIntoNext * 1000 }
}
