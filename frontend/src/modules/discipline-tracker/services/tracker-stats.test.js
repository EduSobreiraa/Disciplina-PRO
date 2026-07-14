import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateTrackerStats, getMarkKey, getScoreClass } from './tracker-stats.js'

test('calcula disciplina apenas para o mês e comportamentos ativos', () => {
  const state = { behaviors: [{ id: 'a', active: true }, { id: 'b', active: false }], marks: { [getMarkKey(2026, 6, 1, 'a')]: 1, [getMarkKey(2026, 6, 2, 'a')]: 2, [getMarkKey(2026, 6, 1, 'b')]: 1, [getMarkKey(2026, 5, 1, 'a')]: 1 } }
  const stats = calculateTrackerStats(state, 2026, 6)
  assert.deepEqual({ greens: stats.greens, reds: stats.reds, percent: stats.percent }, { greens: 1, reds: 1, percent: 50 })
})

test('classifica faixas de disciplina', () => {
  assert.equal(getScoreClass(90), 'green'); assert.equal(getScoreClass(75), 'gold'); assert.equal(getScoreClass(74), 'red'); assert.equal(getScoreClass(null), 'neutral')
})
