const STORAGE_KEY = 'disciplina-pro:gamification:v1'
export const emptyGamificationState = { transactions: [], achievements: [] }

export const gamificationLocalRepository = {
  load() {
    try { return { ...emptyGamificationState, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) } }
    catch { return { ...emptyGamificationState } }
  },
  save(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return state },
}
