import { calculateMissionMetrics, civilDateKey, isoWeekKey } from './mission-metrics.js'

describe('Mission metrics', () => {
  it('uses tenant civil time for ISO weekly XP', () => {
    const instant = new Date('2026-08-02T10:30:00.000Z')
    expect(civilDateKey(instant, 'Pacific/Kiritimati')).toBe('2026-08-03')
    expect(isoWeekKey('2026-08-03')).toBe('2026-W32')
  })

  it('derives monthly, lifetime and ritual metrics without producing facts', () => {
    const metrics = calculateMissionMetrics({
      activeBehaviorIds: ['a', 'b'],
      monthMarks: [
        { behaviorId: 'a', trackedOn: new Date('2026-08-01'), status: 'COMPLETED' },
        { behaviorId: 'b', trackedOn: new Date('2026-08-01'), status: 'COMPLETED' },
        { behaviorId: 'a', trackedOn: new Date('2026-08-02'), status: 'COMPLETED' },
        { behaviorId: 'b', trackedOn: new Date('2026-08-02'), status: 'FAILED' },
      ],
      totalGreens: 12,
      ritualSectionCounts: [{ sectionKey: 'opening', count: 4 }, { sectionKey: 'closing', count: 4 }],
      xpTransactions: [{ amount: 100, occurredAt: new Date('2026-08-03T02:00:00Z') }],
      today: '2026-08-03',
      timeZone: 'America/Bahia',
    })
    expect(metrics).toEqual({ perfectDays: 1, perfectStreak: 1, monthPercent: 75, minimumBehaviorPercent: 50, weeklyXp: 0, markedDays: 2, totalGreens: 12, completedRitualSections: 1 })
  })
})
