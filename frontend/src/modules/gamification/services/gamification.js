import { achievementRules, gamificationRules, levels } from '../data/gamification-rules.js'

export function summarizeGamification(state) {
  const xp = Math.max(0, state.transactions.reduce((sum, item) => sum + item.amount, 0))
  const counts = state.transactions.filter((item) => item.amount > 0).reduce((result, item) => ({ ...result, [item.eventType]: (result[item.eventType] ?? 0) + 1 }), {})
  const level = [...levels].reverse().find((item) => xp >= item.minimum) ?? levels[0]
  const nextLevel = levels.find((item) => item.minimum > xp) ?? null
  const progress = nextLevel ? Math.round((xp - level.minimum) / (nextLevel.minimum - level.minimum) * 100) : 100
  return { xp, counts, level, nextLevel, progress }
}

export function appendAward(state, eventType, sourceKey, occurredAt = new Date().toISOString()) {
  const rule = gamificationRules[eventType]
  const sourceTransactions = state.transactions.filter((item) => item.sourceKey === sourceKey)
  if (!rule || sourceTransactions.reduce((sum, item) => sum + item.amount, 0) > 0) return state
  const sequence = sourceTransactions.length + 1
  return { ...state, transactions: [...state.transactions, { id: `xp-${sourceKey}-${sequence}`, idempotencyKey: `award:${sourceKey}:${sequence}`, sourceKey, eventType, amount: rule.xp, description: rule.label, occurredAt }] }
}

export function appendReversal(state, sourceKey, occurredAt = new Date().toISOString()) {
  const sourceTransactions = state.transactions.filter((item) => item.sourceKey === sourceKey)
  const balance = sourceTransactions.reduce((sum, item) => sum + item.amount, 0)
  const award = sourceTransactions.find((item) => item.amount > 0)
  if (!award || balance <= 0) return state
  const sequence = sourceTransactions.length + 1
  return { ...state, transactions: [...state.transactions, { id: `xp-reversal-${sourceKey}-${sequence}`, idempotencyKey: `reversal:${sourceKey}:${sequence}`, sourceKey, eventType: award.eventType, amount: -balance, description: `Reversão: ${award.description}`, occurredAt }] }
}

export function unlockAchievements(state, occurredAt = new Date().toISOString()) {
  const summary = summarizeGamification(state)
  const known = new Set(state.achievements.map((item) => item.achievementId))
  const unlocked = achievementRules.filter((rule) => !known.has(rule.id) && rule.test(summary)).map((rule) => ({ achievementId: rule.id, unlockedAt: occurredAt }))
  return unlocked.length ? { ...state, achievements: [...state.achievements, ...unlocked] } : state
}
