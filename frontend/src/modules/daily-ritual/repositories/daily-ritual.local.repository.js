const STORAGE_KEY = 'disciplina-pro:daily-ritual:v1'

const initialState = () => ({ days: {} })

export const getLocalDateKey = (date = new Date()) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')

export const dailyRitualLocalRepository = {
  load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? initialState() }
    catch { return initialState() }
  },
  save(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return state },
}
