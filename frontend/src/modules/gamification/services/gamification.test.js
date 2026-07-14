import assert from 'node:assert/strict'
import test from 'node:test'
import { appendAward, appendReversal, summarizeGamification, unlockAchievements } from './gamification.js'

const empty = () => ({ transactions: [], achievements: [] })

test('ledger concede XP uma única vez e usa compensação para desfazer', () => {
  const awarded = appendAward(empty(), 'TRACKER_GREEN', 'tracker:2026-07-14:a', '2026-07-14T10:00:00Z')
  assert.equal(appendAward(awarded, 'TRACKER_GREEN', 'tracker:2026-07-14:a').transactions.length, 1)
  const reversed = appendReversal(awarded, 'tracker:2026-07-14:a', '2026-07-14T11:00:00Z')
  assert.equal(summarizeGamification(reversed).xp, 0)
  assert.equal(reversed.transactions[1].amount, -10)
  assert.equal(summarizeGamification(appendAward(reversed, 'TRACKER_GREEN', 'tracker:2026-07-14:a')).xp, 10)
})

test('deriva nível e registra conquista como fato', () => {
  let state = empty()
  for (let index = 0; index < 50; index += 1) state = appendAward(state, 'TRACKER_GREEN', `mark:${index}`, `2026-07-14T10:${String(index).padStart(2, '0')}:00Z`)
  state = unlockAchievements(state, '2026-07-14T12:00:00Z')
  const summary = summarizeGamification(state)
  assert.equal(summary.xp, 500)
  assert.equal(summary.level.name, 'Soldado')
  assert.ok(state.achievements.some((item) => item.achievementId === 'xp-500'))
})
