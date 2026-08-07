import assert from 'node:assert/strict'
import test from 'node:test'
import { parseTrackerBackup, TRACKER_BACKUP_VERSION } from './tracker-backup.js'

test('accepts the canonical server backup without its transport metadata', () => {
  const parsed = parseTrackerBackup(JSON.stringify({
    type: 'disciplina-pro-tracker',
    version: TRACKER_BACKUP_VERSION,
    exportedAt: '2026-08-03T00:00:00.000Z',
    data: {
      behaviors: [{ key: 'source-key', name: 'Leitura', position: 0, active: true }],
      marks: [{ behaviorKey: 'source-key', trackedOn: '2026-08-03', status: 'FAILED', justification: 'Interrupção' }],
    },
  }))
  assert.deepEqual(parsed, {
    type: 'disciplina-pro-tracker',
    version: 2,
    data: {
      behaviors: [{ key: 'source-key', name: 'Leitura', position: 0, active: true }],
      marks: [{ behaviorKey: 'source-key', trackedOn: '2026-08-03', status: 'FAILED', justification: 'Interrupção' }],
    },
  })
})

test('converts a legacy local v1 backup to the canonical restore contract', () => {
  const parsed = parseTrackerBackup(JSON.stringify({
    type: 'disciplina-pro-tracker',
    version: 1,
    data: {
      behaviors: [{ id: 'legacy-id', name: 'Leitura', order: 3, active: true }],
      marks: { '2026-08-03:legacy-id': 2 },
      justifications: { '2026-08-03:legacy-id': 'Sem energia' },
    },
  }))
  assert.deepEqual(parsed.data, {
    behaviors: [{ key: 'legacy-id', name: 'Leitura', position: 3, active: true }],
    marks: [{ behaviorKey: 'legacy-id', trackedOn: '2026-08-03', status: 'FAILED', justification: 'Sem energia' }],
  })
})

test('rejects malformed and unknown backup formats before upload', () => {
  assert.throws(() => parseTrackerBackup('{'), /JSON válido/)
  assert.throws(() => parseTrackerBackup('{"type":"other","version":2}'), /Formato/)
  assert.throws(() => parseTrackerBackup('{"type":"disciplina-pro-tracker","version":99}'), /Versão/)
})
