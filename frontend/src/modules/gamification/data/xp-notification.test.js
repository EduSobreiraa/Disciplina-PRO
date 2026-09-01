import assert from 'node:assert/strict'
import test from 'node:test'
import { getXpIncrease } from './xp-notification.js'

test('não anuncia o saldo existente na primeira projeção', () => {
  assert.equal(getXpIncrease(null, 120), 0)
})

test('retorna somente o aumento confirmado entre projeções', () => {
  assert.equal(getXpIncrease(120, 125), 5)
})

test('não anuncia saldo igual, reduzido ou inválido', () => {
  assert.equal(getXpIncrease(125, 125), 0)
  assert.equal(getXpIncrease(125, 120), 0)
  assert.equal(getXpIncrease(125, undefined), 0)
})
