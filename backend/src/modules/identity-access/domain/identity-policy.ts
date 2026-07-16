import { InvalidEmailError, WeakPasswordError } from './identity.errors.js'

const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

export function normalizeEmail(email: string) {
  const normalized = email.trim().normalize('NFC').toLowerCase()
  if (normalized.length > 320 || !SIMPLE_EMAIL_PATTERN.test(normalized)) throw new InvalidEmailError()
  return normalized
}

export function assertPasswordPolicy(password: string) {
  const length = [...password.normalize('NFC')].length
  if (length < 15 || length > 128) throw new WeakPasswordError()
}
