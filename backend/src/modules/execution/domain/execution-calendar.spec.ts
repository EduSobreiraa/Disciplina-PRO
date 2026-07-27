import { ExecutionCalendar } from './execution-calendar.js'

const date = (value: string) => new Date(`${value}T00:00:00.000Z`)

describe('ExecutionCalendar', () => {
  const calendar = new ExecutionCalendar()

  it('derives the tenant civil date instead of the server date', () => {
    const instant = new Date('2026-07-26T01:30:00.000Z')
    expect(calendar.today(instant, 'America/Bahia')).toEqual(date('2026-07-25'))
    expect(calendar.today(instant, 'Asia/Tokyo')).toEqual(date('2026-07-26'))
  })

  it('keeps civil days reproducible across daylight-saving changes', () => {
    const result = calendar.calculate({
      now: new Date('2026-03-09T16:00:00.000Z'),
      timeZone: 'America/New_York',
      startedOn: date('2026-03-07'),
      durationDays: 66,
      pauses: [],
    })
    expect(result).toMatchObject({ today: date('2026-03-09'), elapsedActiveDays: 2, programDay: 3 })
  })

  it('discounts closed and open pause dates and freezes the current day', () => {
    const closed = calendar.calculate({
      now: new Date('2026-07-10T15:00:00.000Z'),
      timeZone: 'America/Bahia',
      startedOn: date('2026-07-01'),
      durationDays: 10,
      pauses: [{ pauseStartsOn: date('2026-07-03'), resumedOn: date('2026-07-05') }],
    })
    expect(closed).toMatchObject({ elapsedActiveDays: 7, programDay: 8, isCompletable: false })

    const open = calendar.calculate({
      now: new Date('2026-07-10T15:00:00.000Z'),
      timeZone: 'America/Bahia',
      startedOn: date('2026-07-01'),
      durationDays: 10,
      pauses: [{ pauseStartsOn: date('2026-07-08'), resumedOn: null }],
    })
    expect(open).toMatchObject({ elapsedActiveDays: 6, programDay: 7, isCompletable: false })
  })

  it('marks only the final temporal day as completable', () => {
    const before = calendar.calculate({
      now: new Date('2026-07-09T15:00:00.000Z'),
      timeZone: 'UTC',
      startedOn: date('2026-07-01'),
      durationDays: 10,
      pauses: [],
    })
    const final = calendar.calculate({
      now: new Date('2026-07-10T15:00:00.000Z'),
      timeZone: 'UTC',
      startedOn: date('2026-07-01'),
      durationDays: 10,
      pauses: [],
    })
    expect(before).toMatchObject({ programDay: 9, isCompletable: false })
    expect(final).toMatchObject({ programDay: 10, isCompletable: true })
  })
})
