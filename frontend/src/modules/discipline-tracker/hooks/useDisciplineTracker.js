import { useMemo, useState } from 'react'
import { disciplineTrackerLocalRepository } from '../repositories/discipline-tracker.local.repository'
import { calculateTrackerStats, getMarkKey } from '../services/tracker-stats'

export function useDisciplineTracker(year, month) {
  const [state, setState] = useState(() => disciplineTrackerLocalRepository.load())
  const stats = useMemo(() => calculateTrackerStats(state, year, month), [state, year, month])
  function commit(next) { disciplineTrackerLocalRepository.save(next); setState(next) }
  function cycleMark(day, behaviorId) {
    const key = getMarkKey(year, month, day, behaviorId)
    const current = state.marks[key] ?? 0
    const nextStatus = (current + 1) % 3
    const marks = { ...state.marks }
    const justifications = { ...state.justifications }
    if (nextStatus === 0) { delete marks[key]; delete justifications[key] } else marks[key] = nextStatus
    commit({ ...state, marks, justifications })
    return { key, status: nextStatus }
  }
  function saveJustification(key, text) { commit({ ...state, justifications: { ...state.justifications, [key]: text.trim() } }) }
  function addBehavior(name) {
    if (state.behaviors.filter((behavior) => behavior.active).length >= 20) return false
    const behavior = { id: globalThis.crypto?.randomUUID?.() ?? `behavior-${Date.now()}`, name: name.trim(), order: state.behaviors.length, active: true }
    commit({ ...state, behaviors: [...state.behaviors, behavior] }); return true
  }
  function renameBehavior(id, name) { commit({ ...state, behaviors: state.behaviors.map((behavior) => behavior.id === id ? { ...behavior, name: name.trim() || behavior.name } : behavior) }) }
  function removeBehavior(id) { commit({ ...state, behaviors: state.behaviors.map((behavior) => behavior.id === id ? { ...behavior, active: false } : behavior) }) }
  function replaceState(nextState) { commit(nextState) }
  return { state, stats, cycleMark, saveJustification, addBehavior, renameBehavior, removeBehavior, replaceState }
}
