export const TRACKER_BACKUP_VERSION = 1

export function createTrackerBackup(state) {
  return { type: 'disciplina-pro-tracker', version: TRACKER_BACKUP_VERSION, exportedAt: new Date().toISOString(), data: state }
}

export function parseTrackerBackup(content) {
  let backup
  try { backup = JSON.parse(content) } catch { throw new Error('O arquivo não contém JSON válido.') }
  if (backup?.type !== 'disciplina-pro-tracker' || backup?.version !== TRACKER_BACKUP_VERSION) throw new Error('Formato ou versão de backup incompatível.')
  const data = backup.data
  if (!data || !Array.isArray(data.behaviors) || typeof data.marks !== 'object' || typeof data.justifications !== 'object') throw new Error('O backup não contém a estrutura esperada.')
  if (data.behaviors.some((item) => !item?.id || typeof item.name !== 'string' || typeof item.active !== 'boolean')) throw new Error('O backup possui comportamentos inválidos.')
  if (Object.values(data.marks).some((status) => status !== 1 && status !== 2)) throw new Error('O backup possui marcações inválidas.')
  return data
}
