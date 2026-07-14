const PRIVATE_STORAGE_KEY = 'disciplina-pro:projeto66:private:v2'

const emptyPrivateState = {
  dailyRecords: {}, meditationHistory: [], newSelfDefinition: '', newSelfCheckins: [], difficultHistory: [], crisisHistory: [],
}

function loadState() {
  try { return { ...emptyPrivateState, ...JSON.parse(localStorage.getItem(PRIVATE_STORAGE_KEY) || '{}') } }
  catch { return { ...emptyPrivateState } }
}

function saveState(state) {
  localStorage.setItem(PRIVATE_STORAGE_KEY, JSON.stringify(state))
  return state
}

function append(collection, entry) {
  const state = loadState()
  return saveState({ ...state, [collection]: [...state[collection], entry] })[collection]
}

// Conteúdo íntimo usa armazenamento separado e nunca integra relatórios objetivos.
export const projeto66PrivateLocalRepository = {
  loadPrivateState: loadState,
  loadDailyPrivateRecord(programDay) { return loadState().dailyRecords[programDay] ?? null },
  saveDailyPrivateRecord(programDay, record) {
    const state = loadState()
    saveState({ ...state, dailyRecords: { ...state.dailyRecords, [programDay]: record } })
    return record
  },
  saveMeditation(entry) { return append('meditationHistory', entry) },
  saveNewSelfDefinition(definition) { return saveState({ ...loadState(), newSelfDefinition: definition }) },
  saveNewSelfCheckin(entry) { return append('newSelfCheckins', entry) },
  saveDifficultDay(entry) { return append('difficultHistory', entry) },
  saveCrisis(entry) { return append('crisisHistory', entry) },
}
