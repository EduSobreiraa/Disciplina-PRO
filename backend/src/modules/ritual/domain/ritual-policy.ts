import { InvalidRitualDateError } from './ritual.errors.js'

const DAY_IN_MILLISECONDS = 86_400_000

export function ritualDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new InvalidRitualDateError()
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new InvalidRitualDateError()
  return date
}

export function ritualRange(fromValue: string, toValue: string) {
  const from = ritualDate(fromValue)
  const to = ritualDate(toValue)
  const days = Math.floor((to.getTime() - from.getTime()) / DAY_IN_MILLISECONDS) + 1
  if (days < 1 || days > 366) throw new InvalidRitualDateError()
  return { from, to }
}
