import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateTrackerStats, getBehaviorRanking, getMarkKey, getScoreClass } from './tracker-stats.js'

test('calcula disciplina apenas para o mês e comportamentos ativos', () => {
  const state = { behaviors: [{ id: 'a', active: true }, { id: 'b', active: false }], marks: { [getMarkKey(2026, 6, 1, 'a')]: 1, [getMarkKey(2026, 6, 2, 'a')]: 2, [getMarkKey(2026, 6, 1, 'b')]: 1, [getMarkKey(2026, 5, 1, 'a')]: 1 } }
  const stats = calculateTrackerStats(state, 2026, 6)
  assert.deepEqual({ greens: stats.greens, reds: stats.reds, percent: stats.percent }, { greens: 1, reds: 1, percent: 50 })
})

test('classifica faixas de disciplina', () => {
  assert.equal(getScoreClass(90), 'green'); assert.equal(getScoreClass(75), 'gold'); assert.equal(getScoreClass(74), 'red'); assert.equal(getScoreClass(null), 'neutral')
})

test('identifica dias marcados e dias perfeitos', () => {
  const behaviors = [{ id: 'a', active: true }, { id: 'b', active: true }]
  const marks = { [getMarkKey(2026, 6, 1, 'a')]: 1, [getMarkKey(2026, 6, 1, 'b')]: 1, [getMarkKey(2026, 6, 2, 'a')]: 1 }
  const stats = calculateTrackerStats({ behaviors, marks }, 2026, 6)
  assert.equal(stats.markedDays, 2); assert.equal(stats.perfectDays, 1)
})

test('ordena dados calculáveis para rankings', () => {
  const ranking = getBehaviorRanking([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { a: { greens: 2, reds: 0 }, b: { greens: 1, reds: 1 } })
  assert.deepEqual(ranking.map((item) => item.percent), [100, 50])
})
