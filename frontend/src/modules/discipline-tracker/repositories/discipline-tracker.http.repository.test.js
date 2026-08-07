import assert from 'node:assert/strict'
import test from 'node:test'
import { createDisciplineTrackerHttpRepository, DisciplineTrackerApiError, mapTrackerState } from './discipline-tracker.http.repository.js'

test('maps the server projection to the existing tracker view model', () => {
  assert.deepEqual(mapTrackerState({
    behaviors: [{ id: 'behavior', name: 'Leitura', position: 2, active: true }],
    marks: [
      { behaviorId: 'behavior', trackedOn: '2026-08-03T00:00:00.000Z', status: 'COMPLETED', justification: null },
      { behaviorId: 'behavior', trackedOn: '2026-08-04T00:00:00.000Z', status: 'FAILED', justification: 'Interrupção' },
    ],
  }), {
    behaviors: [{ id: 'behavior', name: 'Leitura', order: 2, active: true }],
    marks: { '2026-08-03:behavior': 1, '2026-08-04:behavior': 2 },
    justifications: { '2026-08-04:behavior': 'Interrupção' },
  })
})

test('uses the authenticated tenant boundary for reads and writes', async () => {
  const calls = []
  const repository = createDisciplineTrackerHttpRepository({
    baseUrl: '/api',
    getTenantId: () => 'tenant-id',
    authorizedFetch: async (url, options) => {
      calls.push({ url, options })
      return url.includes('/tracker/me')
        ? { ok: true, status: 200, json: async () => ({ behaviors: [], marks: [] }) }
        : { ok: true, status: 204 }
    },
  })
  await repository.load(2026, 7)
  await repository.putMark('behavior', '2026-08-03', 'FAILED')
  await repository.restoreBackup({ type: 'disciplina-pro-tracker', version: 2, data: { behaviors: [], marks: [] } })
  assert.equal(calls[0].url, '/api/tracker/me?from=2026-08-01&to=2026-08-31')
  assert.deepEqual(calls[0].options.headers, { 'X-Tenant-Id': 'tenant-id' })
  assert.equal(calls[1].url, '/api/tracker/behaviors/behavior/marks/2026-08-03')
  assert.deepEqual(JSON.parse(calls[1].options.body), { status: 'FAILED' })
  assert.equal(calls[2].url, '/api/tracker/backup')
  assert.equal(calls[2].options.method, 'PUT')
})

test('requires tenant context and maps API problems', async () => {
  const repository = createDisciplineTrackerHttpRepository({
    getTenantId: () => null,
    authorizedFetch: async () => { throw new Error('must not fetch') },
  })
  await assert.rejects(repository.load(2026, 7), (error) => error instanceof DisciplineTrackerApiError && error.code === 'SESSION_CONTEXT_REQUIRED')
})
