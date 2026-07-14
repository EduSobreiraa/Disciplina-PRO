import assert from 'node:assert/strict'
import test from 'node:test'
import { getRitualProgress, getSectionProgress, normalizeTimer } from './ritual-progress.js'

test('calcula progresso de seção e ritual sem duplicar fatos', () => {
  const sections = [{ key: 'a', items: ['x', 'y'] }, { key: 'b', items: ['z'] }]
  assert.deepEqual(getSectionProgress(sections[0].items, { 0: true }), { completed: 1, total: 2, percent: 50, complete: false })
  assert.deepEqual(getRitualProgress(sections, { a: { 0: true, 1: true }, b: { 0: true } }), { completed: 3, total: 3, percent: 100, complete: true })
})

test('normaliza timer em execução e limita a oito ciclos', () => {
  const startedAt = 1_000_000
  assert.equal(normalizeTimer({ completedCycles: 0, remainingSeconds: 1800, runningUntil: startedAt + 1800_000, startedAt }, startedAt + 10_000).remainingSeconds, 1790)
  assert.deepEqual(normalizeTimer({ completedCycles: 7, remainingSeconds: 10, runningUntil: startedAt + 10_000, startedAt }, startedAt + 11_000), { completedCycles: 8, remainingSeconds: 0, runningUntil: null })
})
