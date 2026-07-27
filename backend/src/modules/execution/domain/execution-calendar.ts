export interface ExecutionPausePeriod {
  pauseStartsOn: Date
  resumedOn: Date | null
}

export interface ExecutionCalendarResult {
  today: Date
  programDay: number
  elapsedActiveDays: number
  isCompletable: boolean
}

const DAY_MS = 86_400_000

function dateOnly(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day))
}

function dayNumber(value: Date) {
  return Math.floor(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / DAY_MS)
}

export class ExecutionCalendar {
  today(now: Date, timeZone: string): Date {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value)
    return dateOnly(part('year'), part('month'), part('day'))
  }

  addDays(value: Date, days: number): Date {
    return new Date(value.getTime() + days * DAY_MS)
  }

  differenceInCivilDays(later: Date, earlier: Date): number {
    return dayNumber(later) - dayNumber(earlier)
  }

  calculate(input: {
    now: Date
    timeZone: string
    startedOn: Date
    durationDays: number
    pauses: ExecutionPausePeriod[]
  }): ExecutionCalendarResult {
    const today = this.today(input.now, input.timeZone)
    const elapsedCivilDays = Math.max(0, this.differenceInCivilDays(today, input.startedOn))
    const todayExclusive = this.addDays(today, 1)
    const pausedDays = input.pauses.reduce((total, pause) => {
      const start = pause.pauseStartsOn > input.startedOn ? pause.pauseStartsOn : input.startedOn
      const naturalEnd = pause.resumedOn ?? todayExclusive
      const end = naturalEnd < todayExclusive ? naturalEnd : todayExclusive
      return total + Math.max(0, this.differenceInCivilDays(end, start))
    }, 0)
    const elapsedActiveDays = Math.max(0, elapsedCivilDays - pausedDays)
    const rawProgramDay = elapsedActiveDays + 1
    return {
      today,
      elapsedActiveDays,
      programDay: Math.min(input.durationDays, Math.max(1, rawProgramDay)),
      isCompletable: rawProgramDay >= input.durationDays,
    }
  }
}
