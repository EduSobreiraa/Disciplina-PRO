import { InvalidTenantDataError } from './organization.errors.js'
import { normalizeOperationalReason, normalizeTenantName, validateOrganizationId, validateTenantSlug, validateTenantTimeZone } from './tenant-policy.js'

describe('tenant policy', () => {
  it('normalizes display names and operational reasons', () => {
    expect(normalizeTenantName('  Empresa   Ágil  ')).toBe('Empresa Ágil')
    expect(normalizeOperationalReason('  decisão   confirmada  ')).toBe('decisão confirmada')
  })

  it('accepts canonical slugs, IANA timezones and UUIDs', () => {
    expect(validateTenantSlug('empresa-123')).toBe('empresa-123')
    expect(validateTenantTimeZone('America/Bahia')).toBe('America/Bahia')
    expect(validateOrganizationId('019f854f-1e79-7cb5-ab4e-392158644046')).toBe('019f854f-1e79-7cb5-ab4e-392158644046')
  })

  it('rejects malformed organizational data', () => {
    for (const operation of [
      () => normalizeTenantName(' '),
      () => normalizeOperationalReason('x'),
      () => validateTenantSlug('Empresa Inválida'),
      () => validateTenantTimeZone('-03:00'),
      () => validateTenantTimeZone('Unknown/Zone'),
      () => validateOrganizationId('not-a-uuid'),
    ]) expect(operation).toThrow(InvalidTenantDataError)
  })
})
