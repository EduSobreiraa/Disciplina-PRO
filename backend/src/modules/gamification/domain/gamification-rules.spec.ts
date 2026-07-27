import { INTERNAL_EVENT_TYPES } from '../../events/application/internal-event.contracts.js'
import { ruleFor, summarizeLevel, unlockedAchievementKeys } from './gamification-rules.js'

describe('Gamification rules', () => {
  it('derives XP only from supported server-side facts', () => {
    expect(ruleFor(INTERNAL_EVENT_TYPES.activityCompletionRecorded, 1)).toMatchObject({ amount: 10 })
    expect(ruleFor(INTERNAL_EVENT_TYPES.dailyRecordSubmitted, 1)).toMatchObject({ amount: 50 })
    expect(ruleFor('tracker.local-only', 1)).toBeNull()
    expect(ruleFor(INTERNAL_EVENT_TYPES.dailyRecordSubmitted, 2)).toBeNull()
  })

  it('derives level and achievements without persisting a mutable balance', () => {
    expect(summarizeLevel(500)).toMatchObject({
      balance: 500,
      level: { key: 'soldier' },
      nextLevel: { key: 'elite' },
      progress: 0,
    })
    expect(summarizeLevel(-10).balance).toBe(0)
    expect(unlockedAchievementKeys(500, INTERNAL_EVENT_TYPES.dailyRecordSubmitted))
      .toEqual(expect.arrayContaining(['first-xp', 'project-day', 'xp-500']))
  })
})

