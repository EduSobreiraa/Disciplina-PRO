import assert from 'node:assert/strict'
import test from 'node:test'
import { createPlatformAdministrationHttpRepository } from './platform-administration.http.repository.js'

test('opera somente na fronteira de plataforma sem header de tenant', async () => {
  const calls = []
  const repository = createPlatformAdministrationHttpRepository({
    baseUrl: '/api',
    authorizedFetch: async (url, options = {}) => {
      calls.push({ url, options })
      return { ok: true, json: async () => [] }
    },
  })

  await repository.listTenants()
  await repository.listPrograms()
  await repository.createTenant({ name: 'Spark', slug: 'spark', timeZone: 'America/Bahia' })
  await repository.inviteFirstCeo('tenant-1', 'ceo@spark.test')
  await repository.transitionTenant('tenant-1', 'suspend', 'Operação aprovada')
  await repository.setProgramEnabled('tenant-1', 'program-1', true)

  assert.deepEqual(calls.map(({ url }) => url), [
    '/api/platform/tenants',
    '/api/platform/programs',
    '/api/platform/tenants',
    '/api/platform/tenants/tenant-1/invitations/ceo',
    '/api/platform/tenants/tenant-1/suspend',
    '/api/platform/tenants/tenant-1/programs/program-1/enable',
  ])
  assert.equal(calls.some(({ options }) => Object.keys(options.headers ?? {}).some((key) => key.toLowerCase() === 'x-tenant-id')), false)
})
