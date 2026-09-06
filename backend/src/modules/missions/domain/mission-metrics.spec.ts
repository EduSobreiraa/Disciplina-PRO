import { calculateMissionMetrics, civilDateKey, isoWeekKey } from './mission-metrics.js'

describe('Mission metrics', () => {
  it.each([[2026, 2, 28], [2028, 2, 29], [2026, 9, 30], [2026, 7, 31]])('requires the complete month for 100 percent (%s-%s)', (year, month, length) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const activeBehaviorIds = Array.from({ length: 20 }, (_, index) => String(index))
    const monthMarks = activeBehaviorIds.flatMap((behaviorId) => Array.from({ length }, (_, index) => ({
      behaviorId, trackedOn: new Date(`${prefix}-${String(index + 1).padStart(2, '0')}`), status: 'COMPLETED' as const,
    })))
    const input = { activeBehaviorIds, monthMarks, totalGreens: 0, ritualSectionCounts: [], xpTransactions: [], today: `${prefix}-${length}`, timeZone: 'America/Bahia' }
    expect(calculateMissionMetrics(input).monthPercent).toBe(100)
    monthMarks.pop()
    expect(calculateMissionMetrics(input).monthPercent).toBe(99)
    expect(calculateMissionMetrics(input).minimumBehaviorPercent).toBeLessThan(100)
    expect(calculateMissionMetrics({ ...input, monthMarks: monthMarks.slice(0, 1) }).monthPercent).toBeLessThan(100)
  })
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
    expect(metrics).toEqual({ perfectDays: 1, perfectStreak: 1, monthPercent: 5, minimumBehaviorPercent: 3, weeklyXp: 0, markedDays: 2, totalGreens: 12, completedRitualSections: 1 })
  })
})
