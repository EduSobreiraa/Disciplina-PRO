import assert from 'node:assert/strict'
import test from 'node:test'
import { createMissionsHttpRepository, MissionsApiError } from './missions.http.repository.js'

test('loads the tenant-scoped server projection', async () => {
  const calls = []
  const repository = createMissionsHttpRepository({
    baseUrl: '/api', getTenantId: () => 'tenant-id',
    authorizedFetch: async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200, json: async () => ({ metrics: { perfectDays: 2 } }) } },
  })
  assert.deepEqual(await repository.loadMine(), { metrics: { perfectDays: 2 } })
  assert.deepEqual(calls, [{ url: '/api/missions/me', options: { headers: { 'X-Tenant-Id': 'tenant-id' } } }])
})

test('requires tenant context', async () => {
  const repository = createMissionsHttpRepository({ getTenantId: () => null, authorizedFetch: async () => null })
  await assert.rejects(repository.loadMine(), (error) => error instanceof MissionsApiError && error.code === 'SESSION_CONTEXT_REQUIRED')
})
