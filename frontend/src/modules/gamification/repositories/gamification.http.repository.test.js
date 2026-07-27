import assert from 'node:assert/strict'
import test from 'node:test'
import { createGamificationHttpRepository, GamificationApiError } from './gamification.http.repository.js'

test('loads only the server projection with the selected tenant', async () => {
  let request
  const repository = createGamificationHttpRepository({
    baseUrl: '/api',
    getTenantId: () => 'tenant-a',
    authorizedFetch: async (...args) => {
      request = args
      return { ok: true, json: async () => ({ balance: 60, transactions: [], achievements: [] }) }
    },
  })
  assert.deepEqual(await repository.loadMine(), { balance: 60, transactions: [], achievements: [] })
  assert.deepEqual(request, ['/api/gamification/me', { headers: { 'X-Tenant-Id': 'tenant-a' } }])
})

test('requires tenant context and maps API problems', async () => {
  const withoutTenant = createGamificationHttpRepository({
    getTenantId: () => null,
    authorizedFetch: async () => { throw new Error('não deveria executar') },
  })
  await assert.rejects(withoutTenant.loadMine(), (error) => error instanceof GamificationApiError && error.code === 'SESSION_CONTEXT_REQUIRED')

  const failed = createGamificationHttpRepository({
    getTenantId: () => 'tenant-a',
    authorizedFetch: async () => ({ ok: false, status: 403, json: async () => ({ code: 'TENANT_ACCESS_DENIED', message: 'Negado' }) }),
  })
  await assert.rejects(failed.loadMine(), (error) => error instanceof GamificationApiError && error.status === 403 && error.code === 'TENANT_ACCESS_DENIED')
})
