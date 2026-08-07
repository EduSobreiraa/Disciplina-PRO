import { InvalidTrackerRangeError } from './tracker.errors.js'

const DAY_IN_MILLISECONDS = 86_400_000

export function normalizeBehaviorName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
}

export function trackerDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new InvalidTrackerRangeError()
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new InvalidTrackerRangeError()
  return date
}

export function trackerRange(fromValue: string, toValue: string) {
  const from = trackerDate(fromValue)
  const to = trackerDate(toValue)
  const days = Math.floor((to.getTime() - from.getTime()) / DAY_IN_MILLISECONDS) + 1
  if (days < 1 || days > 366) throw new InvalidTrackerRangeError()
  return { from, to }
}
