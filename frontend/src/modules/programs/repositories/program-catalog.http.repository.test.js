import assert from 'node:assert/strict'
import test from 'node:test'
import { createProgramCatalogHttpRepository, ProgramCatalogApiError } from './program-catalog.http.repository.js'

test('loads the tenant catalog through the authenticated boundary', async () => {
  let request
  const catalog = [{ id: 'program-id', slug: 'projeto66', version: { durationDays: 66 } }]
  const repository = createProgramCatalogHttpRepository({
    baseUrl: '/api',
    getTenantId: () => 'tenant-id',
    authorizedFetch: async (...args) => {
      request = args
      return { ok: true, json: async () => catalog }
    },
  })

  assert.deepEqual(await repository.list(), catalog)
  assert.deepEqual(request, ['/api/programs', { headers: { 'X-Tenant-Id': 'tenant-id' } }])
})

test('requires tenant context and preserves the API problem', async () => {
  const withoutTenant = createProgramCatalogHttpRepository({
    getTenantId: () => null,
    authorizedFetch: async () => { throw new Error('must not fetch') },
  })
  await assert.rejects(withoutTenant.list(), (error) => (
    error instanceof ProgramCatalogApiError && error.code === 'SESSION_CONTEXT_REQUIRED'
  ))

  const failed = createProgramCatalogHttpRepository({
    getTenantId: () => 'tenant-id',
    authorizedFetch: async () => ({
      ok: false,
      status: 403,
      json: async () => ({ code: 'TENANT_ACCESS_DENIED', message: 'Acesso negado' }),
    }),
  })
  await assert.rejects(failed.list(), (error) => (
    error instanceof ProgramCatalogApiError &&
    error.status === 403 &&
    error.code === 'TENANT_ACCESS_DENIED' &&
    error.message === 'Acesso negado'
  ))
})
