import test from 'node:test'
import assert from 'node:assert/strict'
import { getBestStreak, getCurrentProgramDay, getCurrentStreak, getPhaseProgress, getProgressPercent } from './progress.js'
import { calculatePillarScore, getHeatLevel, getScoreStats } from './scoring.js'
import { getChecklistStats } from './checklist.js'

test('calcula o dia por calendário e respeita pausas', () => {
  assert.equal(getCurrentProgramDay('2026-07-01T12:00:00Z', 2, new Date('2026-07-10T12:00:00Z')), 8)
})

test('limita o ciclo entre os dias 1 e 66', () => {
  assert.equal(getCurrentProgramDay('2026-01-01', 0, new Date('2026-07-10')), 66)
})

test('normaliza dias repetidos ao calcular progresso e fases', () => {
  assert.equal(getProgressPercent([1, 1, 2, 67]), 3)
  assert.deepEqual(getPhaseProgress([1, 22, 23, 44, 45, 66]).map((phase) => phase.completed), [2, 2, 2])
})

test('calcula sequência atual e melhor sequência', () => {
  const days = [1, 2, 3, 6, 7]
  assert.equal(getCurrentStreak(days), 2)
  assert.equal(getCurrentStreak(days, 8), 0)
  assert.equal(getBestStreak(days), 3)
})

test('calcula média dos sete últimos registros e melhor placar', () => {
  const stats = getScoreStats({ 1: { score: 20 }, 2: { placar: 50 }, 3: { score: 40 } })
  assert.equal(stats.averageLast7, 36.7)
  assert.deepEqual(stats.best, { day: 2, score: 50 })
})

test('classifica intensidade do heatmap', () => {
  assert.equal(getHeatLevel(null), 'pending')
  assert.equal(getHeatLevel(20), 'low')
  assert.equal(getHeatLevel(30), 'medium')
  assert.equal(getHeatLevel(50), 'high')
})

test('soma os seis pilares e limita valores entre zero e dez', () => {
  assert.equal(calculatePillarScore({ a: 10, b: 8, c: 5, d: 3, e: 11, f: -2 }), 36)
})

test('calcula progresso e Dia de Comando do checklist', () => {
  const checklist = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`item:${index}`, true]))
  assert.deepEqual(getChecklistStats(checklist, 12), { checked: 10, total: 12, percent: 83, commandDay: true, complete: false })
})
