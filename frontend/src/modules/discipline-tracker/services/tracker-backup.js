export const TRACKER_BACKUP_VERSION = 2

export function parseTrackerBackup(content) {
  let backup
  try { backup = JSON.parse(content) } catch { throw new Error('O arquivo não contém JSON válido.') }
  if (backup?.type !== 'disciplina-pro-tracker') throw new Error('Formato de backup incompatível.')
  if (backup.version === 1) return convertLegacyBackup(backup)
  if (backup.version !== TRACKER_BACKUP_VERSION) throw new Error('Versão de backup incompatível.')
  const data = backup.data
  if (!data || !Array.isArray(data.behaviors) || !Array.isArray(data.marks)) throw new Error('O backup não contém a estrutura esperada.')
  return { type: 'disciplina-pro-tracker', version: TRACKER_BACKUP_VERSION, data }
}

function convertLegacyBackup(backup) {
  const data = backup.data
  if (!data || !Array.isArray(data.behaviors) || !data.marks || typeof data.marks !== 'object' || !data.justifications || typeof data.justifications !== 'object') throw new Error('O backup legado não contém a estrutura esperada.')
  if (data.behaviors.some((item) => !item?.id || typeof item.name !== 'string' || typeof item.active !== 'boolean')) throw new Error('O backup legado possui comportamentos inválidos.')
  const behaviors = data.behaviors.map((behavior, index) => ({
    key: String(behavior.id),
    name: behavior.name,
    position: Number.isInteger(behavior.order) ? behavior.order : index,
    active: behavior.active,
  }))
  const marks = Object.entries(data.marks).map(([key, status]) => {
    const trackedOn = key.slice(0, 10)
    const behaviorKey = key.slice(11)
    if (!/^\d{4}-\d{2}-\d{2}:/.test(key) || !behaviorKey || (status !== 1 && status !== 2)) throw new Error('O backup legado possui marcações inválidas.')
    const justification = data.justifications[key]
    return {
      behaviorKey,
      trackedOn,
      status: status === 1 ? 'COMPLETED' : 'FAILED',
      justification: typeof justification === 'string' && justification.trim() ? justification : null,
    }
  })
  return { type: 'disciplina-pro-tracker', version: TRACKER_BACKUP_VERSION, data: { behaviors, marks } }
}
