import assert from 'node:assert/strict'
import test from 'node:test'
import { getMissionPeriodKey, getPerfectStreak, getWeekKey } from './mission-progress.js'

test('calcula melhor sequência apenas com dias perfeitos consecutivos', () => {
  const days = { 1: { greens: 2, reds: 0 }, 2: { greens: 2, reds: 0 }, 4: { greens: 2, reds: 0 }, 5: { greens: 1, reds: 1 } }
  assert.equal(getPerfectStreak(days, 2), 2)
})

test('gera chaves estáveis para períodos de missão', () => {
  const date = new Date('2026-07-14T12:00:00Z')
  assert.equal(getWeekKey(date), '2026-W29')
  assert.equal(getMissionPeriodKey('month', date), '2026-07')
  assert.equal(getMissionPeriodKey('lifetime', date), 'lifetime')
})
