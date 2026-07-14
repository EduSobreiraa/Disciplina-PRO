import { defaultBehaviors } from '../data/default-behaviors'

const STORAGE_KEY = 'disciplina-pro:tracker:v1'
const createId = () => globalThis.crypto?.randomUUID?.() ?? `behavior-${Date.now()}-${Math.random()}`

function initialState() {
  return { behaviors: defaultBehaviors.map((name, order) => ({ id: createId(), name, order, active: true })), marks: {}, justifications: {} }
}

export const disciplineTrackerLocalRepository = {
  load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? initialState() }
    catch { return initialState() }
  },
  save(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return state },
}
