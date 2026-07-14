const STORAGE_KEY = 'disciplina-pro:projeto66:cycle:v1'

export const emptyProjeto66Cycle = {
  status: 'AVAILABLE',
  startedAt: null,
  completedDays: [],
  dailyRecords: {},
  checklistByDay: {},
}

export const projeto66LocalRepository = {
  loadCycle() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? { ...emptyProjeto66Cycle, ...JSON.parse(stored) } : { ...emptyProjeto66Cycle }
    } catch {
      return { ...emptyProjeto66Cycle }
    }
  },
  saveCycle(cycle) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cycle))
    return cycle
  },
  saveDailyRecord(programDay, record) {
    const cycle = this.loadCycle()
    const completedDays = [...new Set([...cycle.completedDays, programDay])].sort((a, b) => a - b)
    const next = { ...cycle, completedDays, dailyRecords: { ...cycle.dailyRecords, [programDay]: record } }
    return this.saveCycle(next)
  },
  saveChecklist(programDay, checklist) {
    const cycle = this.loadCycle()
    const next = { ...cycle, checklistByDay: { ...cycle.checklistByDay, [programDay]: checklist } }
    return this.saveCycle(next)
  },
  resetChecklist(programDay) {
    const cycle = this.loadCycle()
    const checklistByDay = { ...cycle.checklistByDay }
    delete checklistByDay[programDay]
    return this.saveCycle({ ...cycle, checklistByDay })
  },
  clearCycle() {
    localStorage.removeItem(STORAGE_KEY)
  },
}
