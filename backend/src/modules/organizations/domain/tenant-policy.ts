import { InvalidTenantDataError } from './organization.errors.js'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export function normalizeTenantName(value: string) {
  const name = value.trim().normalize('NFC').replace(/\s+/gu, ' ')
  if (!name || name.length > 160) throw new InvalidTenantDataError('Nome do tenant inválido')
  return name
}

export function validateTenantSlug(value: string) {
  if (value.length > 80 || !SLUG_PATTERN.test(value)) throw new InvalidTenantDataError('Slug do tenant inválido')
  return value
}

export function validateTenantTimeZone(value: string) {
  if (!value || value.length > 100 || /^[+-]\d{2}:?\d{2}$/u.test(value)) throw new InvalidTenantDataError('Timezone do tenant inválido')
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
  } catch {
    throw new InvalidTenantDataError('Timezone do tenant inválido')
  }
  return value
}

export function normalizeOperationalReason(value: string) {
  const reason = value.trim().normalize('NFC').replace(/\s+/gu, ' ')
  if (reason.length < 3 || reason.length > 500) throw new InvalidTenantDataError('Motivo operacional inválido')
  return reason
}

export function validateOrganizationId(value: string) {
  if (!UUID_PATTERN.test(value)) throw new InvalidTenantDataError('Identificador inválido')
  return value.toLowerCase()
}
