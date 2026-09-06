import { InvalidEmailError, WeakPasswordError } from './identity.errors.js'
import { isSingleEmailAddress } from '../../../email-address.js'

export function normalizeEmail(email: string) {
  const normalized = email.trim().normalize('NFC').toLowerCase()
  if (!isSingleEmailAddress(normalized)) throw new InvalidEmailError()
  return normalized
}

export function assertPasswordPolicy(password: string) {
  const length = [...password.normalize('NFC')].length
  if (length < 15 || length > 128) throw new WeakPasswordError()
}
