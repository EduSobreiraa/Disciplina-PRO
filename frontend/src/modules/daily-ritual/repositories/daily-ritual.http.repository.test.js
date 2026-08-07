import assert from 'node:assert/strict'
import test from 'node:test'
import { ritualSections } from '../data/ritual-content.js'
import { createDailyRitualHttpRepository, DailyRitualApiError, getDateKeyInTimeZone, mapRitualDay } from './daily-ritual.http.repository.js'

test('derives the calendar date from the tenant time zone', () => {
  const instant = new Date('2026-08-03T10:30:00.000Z')
  assert.equal(getDateKeyInTimeZone('Pacific/Kiritimati', instant), '2026-08-04')
  assert.equal(getDateKeyInTimeZone('America/Bahia', instant), '2026-08-03')
})

test('maps stable server keys to the existing ritual view model', () => {
  assert.deepEqual(mapRitualDay({
    checks: [
      { sectionKey: 'opening', itemKey: 'declare-behaviors' },
      { sectionKey: 'closing', itemKey: 'read-score' },
      { sectionKey: 'unknown', itemKey: 'ignored' },
    ],
    timer: { completedCycles: 2, remainingSeconds: 900, runningStartedAt: null, runningUntil: null },
  }, ritualSections), {
    checks: { opening: { 1: true }, closing: { 4: true } },
    timer: { completedCycles: 2, remainingSeconds: 900, runningStartedAt: null, runningUntil: null },
  })
})

test('uses the authenticated tenant boundary for ritual reads and commands', async () => {
  const calls = []
  const day = { checks: [], timer: null }
  const repository = createDailyRitualHttpRepository({
    baseUrl: '/api',
    getTenantId: () => 'tenant-id',
    authorizedFetch: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, status: 200, json: async () => url.includes('?') ? { days: [day] } : day }
    },
  })

  assert.equal(await repository.load('2026-08-03'), day)
  await repository.setCheck('2026-08-03', 'opening', 'review-panel', true)
  await repository.changeTimer('2026-08-03', 'start')

  assert.equal(calls[0].url, '/api/ritual/me?from=2026-08-03&to=2026-08-03')
  assert.deepEqual(calls[0].options.headers, { 'X-Tenant-Id': 'tenant-id' })
  assert.equal(calls[1].url, '/api/ritual/me/2026-08-03/checks/opening/review-panel')
  assert.equal(calls[1].options.method, 'PUT')
  assert.deepEqual(JSON.parse(calls[1].options.body), { completed: true })
  assert.equal(calls[2].url, '/api/ritual/me/2026-08-03/timer/start')
  assert.equal(calls[2].options.method, 'POST')
})

test('requires tenant context and maps API problems', async () => {
  const withoutTenant = createDailyRitualHttpRepository({
    getTenantId: () => null,
    authorizedFetch: async () => { throw new Error('must not fetch') },
  })
  await assert.rejects(withoutTenant.load('2026-08-03'), (error) => error instanceof DailyRitualApiError && error.code === 'SESSION_CONTEXT_REQUIRED')

  const rejected = createDailyRitualHttpRepository({
    getTenantId: () => 'tenant-id',
    authorizedFetch: async () => ({ ok: false, status: 409, json: async () => ({ code: 'RITUAL_TIMER_RUNNING', message: 'Cronômetro em execução' }) }),
  })
  await assert.rejects(rejected.changeTimer('2026-08-03', 'start'), (error) => error instanceof DailyRitualApiError && error.status === 409 && error.code === 'RITUAL_TIMER_RUNNING')
})
