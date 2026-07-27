import assert from 'node:assert/strict'
import test from 'node:test'
import { createProjeto66HttpRepository, mapEnrollmentToProjeto66Cycle, Projeto66ApiError } from './projeto66.http.repository.js'

const detail = {
  id: 'enrollment',
  status: 'ACTIVE',
  startedAt: '2026-07-25T12:00:00.000Z',
  calendar: { programDay: 2 },
  version: { durationDays: 66 },
  activities: [{ id: 'activity', key: 'meditar', title: 'Meditar', frequency: 'DAILY' }],
  activityCompletions: [{ activityId: 'activity', programDay: 2 }],
  dailyRecords: [{
    programDay: 2,
    submittedAt: '2026-07-25T12:30:00.000Z',
    pillarScores: [{ pillarKey: 'disciplina', score: 8 }, { pillarKey: 'saude', score: 7 }],
  }],
}

test('maps only objective projection into the Projeto 66 cycle', () => {
  assert.deepEqual(mapEnrollmentToProjeto66Cycle(detail), {
    id: 'enrollment',
    status: 'ACTIVE',
    startedAt: '2026-07-25T12:00:00.000Z',
    currentDay: 2,
    durationDays: 66,
    completedDays: [2],
    dailyRecords: {
      2: {
        programDay: 2,
        pillars: { disciplina: 8, saude: 7 },
        score: 15,
        recordedAt: '2026-07-25T12:30:00.000Z',
      },
    },
    checklistByDay: { 2: { meditar: true } },
    activities: { meditar: detail.activities[0] },
  })
})

test('sends tenant and bearer only through the HTTP boundary', async () => {
  const calls = []
  const repository = createProjeto66HttpRepository({
    baseUrl: 'https://api.example.test/api',
    getAccessToken: () => 'access-token',
    getTenantId: () => 'tenant-id',
    fetchImplementation: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, status: 200, json: async () => detail }
    },
  })
  await repository.saveDailyRecord('enrollment', { disciplina: 8, saude: 7 })
  assert.equal(calls[0].url, 'https://api.example.test/api/enrollments/enrollment/daily-record')
  assert.deepEqual(calls[0].options.headers, {
    Authorization: 'Bearer access-token',
    'X-Tenant-Id': 'tenant-id',
    'Content-Type': 'application/json',
  })
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    scores: [{ pillarKey: 'disciplina', score: 8 }, { pillarKey: 'saude', score: 7 }],
  })
  assert.equal(calls[1].url, 'https://api.example.test/api/enrollments/enrollment')
})

test('requires session context before performing a request', async () => {
  const repository = createProjeto66HttpRepository({
    getAccessToken: () => null,
    getTenantId: () => 'tenant-id',
    fetchImplementation: () => { throw new Error('must not fetch') },
  })
  await assert.rejects(repository.listEnrollments(), (error) => (
    error instanceof Projeto66ApiError && error.code === 'SESSION_CONTEXT_REQUIRED'
  ))
})
