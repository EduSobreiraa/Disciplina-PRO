import assert from 'node:assert/strict'
import test from 'node:test'
import { createTenantAsyncScope, tenantScopeKey } from './tenant-async-scope.js'

function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

test('a tenant key changes to remount the tenant-scoped application subtree', () => {
  assert.notEqual(tenantScopeKey('tenant-a'), tenantScopeKey('tenant-b'))
  assert.equal(tenantScopeKey(null), 'anonymous')
})

test('ignores a delayed tenant A read after tenant B becomes current', async () => {
  const scope = createTenantAsyncScope('tenant-a')
  const tenantARead = scope.capture()
  const read = deferred()
  let visibleTenant = 'tenant-b'
  const completion = read.promise.then((tenant) => scope.commit(tenantARead, () => { visibleTenant = tenant }))

  scope.sync('tenant-b')
  read.resolve('tenant-a')

  assert.equal(await completion, false)
  assert.equal(visibleTenant, 'tenant-b')
})

test('ignores a delayed tenant A mutation result after tenant B becomes current', async () => {
  const scope = createTenantAsyncScope('tenant-a')
  const tenantAMutation = scope.capture()
  const mutation = deferred()
  let delivery = null
  const completion = mutation.promise.then((result) => scope.commit(tenantAMutation, () => { delivery = result }))

  scope.sync('tenant-b')
  mutation.resolve({ email: 'old@tenant.test' })

  assert.equal(await completion, false)
  assert.equal(delivery, null)
})

test('accepts the current tenant result', () => {
  const scope = createTenantAsyncScope('tenant-a')
  scope.sync('tenant-b')
  const tenantBRequest = scope.capture()
  let visibleTenant = null

  assert.equal(scope.commit(tenantBRequest, () => { visibleTenant = 'tenant-b' }), true)
  assert.equal(visibleTenant, 'tenant-b')
})
