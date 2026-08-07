import test from 'node:test'
import assert from 'node:assert/strict'
import { createTenantAdministrationHttpRepository, TenantAdministrationApiError } from './tenant-administration.http.repository.js'

test('scopes administration reads to the selected tenant', async () => {
  const calls = []
  const repository = createTenantAdministrationHttpRepository({
    baseUrl: '/api',
    getTenantId: () => 'tenant-1',
    authorizedFetch: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, json: async () => [] }
    },
  })

  await repository.listMemberships()
  await repository.listTeams()
  assert.deepEqual(calls.map(({ url }) => url), ['/api/memberships', '/api/teams'])
  assert.ok(calls.every(({ options }) => options.headers['X-Tenant-Id'] === 'tenant-1'))
})

test('rejects reads without tenant context and maps API problems', async () => {
  const missing = createTenantAdministrationHttpRepository({ getTenantId: () => null, authorizedFetch: async () => assert.fail() })
  await assert.rejects(() => missing.listMemberships(), (error) => error instanceof TenantAdministrationApiError && error.code === 'SESSION_CONTEXT_REQUIRED')

  const denied = createTenantAdministrationHttpRepository({
    getTenantId: () => 'tenant-1',
    authorizedFetch: async () => ({ ok: false, status: 403, json: async () => ({ code: 'TENANT_PERMISSION_DENIED', message: 'Sem permissão' }) }),
  })
  await assert.rejects(() => denied.listTeams(), (error) => error.status === 403 && error.code === 'TENANT_PERMISSION_DENIED')
})

test('maps team lifecycle commands without losing tenant scope', async () => {
  const calls = []
  const repository = createTenantAdministrationHttpRepository({
    getTenantId: () => 'tenant-1',
    authorizedFetch: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, json: async () => ({}) }
    },
  })
  await repository.createTeam('Operações')
  await repository.renameTeam('team-1', 'Operações Norte')
  await repository.archiveTeam('team-1')
  await repository.restoreTeam('team-1')

  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    ['/api/teams', 'POST'],
    ['/api/teams/team-1', 'PATCH'],
    ['/api/teams/team-1/archive', 'PATCH'],
    ['/api/teams/team-1/restore', 'PATCH'],
  ])
  assert.ok(calls.every(({ options }) => options.headers['X-Tenant-Id'] === 'tenant-1'))
  assert.equal(calls[0].options.body, JSON.stringify({ name: 'Operações' }))
})

test('maps membership lifecycle and team assignment commands', async () => {
  const calls = []
  const repository = createTenantAdministrationHttpRepository({
    getTenantId: () => 'tenant-1',
    authorizedFetch: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, json: async () => ({}) }
    },
  })
  await repository.changeMembershipRole('member-1', 'MANAGER')
  await repository.changeMembershipStatus('member-1', 'suspend', 'Reorganização confirmada')
  await repository.assignTeamMembership('team-1', 'member-1', 'MANAGER')
  await repository.endTeamMembership('team-1', 'member-1')

  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    ['/api/memberships/member-1/role', 'PATCH'],
    ['/api/memberships/member-1/suspend', 'PATCH'],
    ['/api/teams/team-1/memberships', 'POST'],
    ['/api/teams/team-1/memberships/member-1/end', 'PATCH'],
  ])
  assert.ok(calls.every(({ options }) => options.headers['X-Tenant-Id'] === 'tenant-1'))
})

test('maps invitation reads and commands without exposing transport details', async () => {
  const calls = []
  const repository = createTenantAdministrationHttpRepository({
    getTenantId: () => 'tenant-1',
    authorizedFetch: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, json: async () => ({ deliveryStatus: 'SENT' }) }
    },
  })
  await repository.listInvitations()
  await repository.createInvitation({ email: 'nova@empresa.test', role: 'USER', teams: [] })
  await repository.resendInvitation('invitation-1')
  await repository.revokeInvitation('invitation-1')
  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    ['/api/invitations', undefined],
    ['/api/invitations', 'POST'],
    ['/api/invitations/invitation-1/resend', 'PATCH'],
    ['/api/invitations/invitation-1/revoke', 'PATCH'],
  ])
  assert.ok(calls.every(({ options }) => options.headers['X-Tenant-Id'] === 'tenant-1'))
})

test('maps tenant and team reporting/audit reads', async () => {
  const calls = []
  const repository = createTenantAdministrationHttpRepository({
    getTenantId: () => 'tenant-1',
    authorizedFetch: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, json: async () => ({}) }
    },
  })
  await repository.getTenantReport()
  await repository.getTeamReport('team-1')
  await repository.getTenantAudit(2, 10)
  await repository.getTeamAudit('team-1', 3, 15)
  assert.deepEqual(calls.map(({ url }) => url), [
    '/api/reports/tenant',
    '/api/reports/teams/team-1',
    '/api/audit/tenant?page=2&limit=10',
    '/api/audit/teams/team-1?page=3&limit=15',
  ])
  assert.ok(calls.every(({ options }) => options.headers['X-Tenant-Id'] === 'tenant-1'))
})
