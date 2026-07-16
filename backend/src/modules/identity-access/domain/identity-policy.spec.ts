import { InvalidEmailError, WeakPasswordError } from './identity.errors.js'
import { assertPasswordPolicy, normalizeEmail } from './identity-policy.js'

describe('identity policy', () => {
  it('normalizes email for canonical lookup', () => {
    expect(normalizeEmail('  Eduardo@Example.COM ')).toBe('eduardo@example.com')
  })

  it('rejects malformed email', () => {
    expect(() => normalizeEmail('invalid')).toThrow(InvalidEmailError)
  })

  it('requires a password with at least 15 unicode characters', () => {
    expect(() => assertPasswordPolicy('short')).toThrow(WeakPasswordError)
    expect(() => assertPasswordPolicy('frase longa e segura')).not.toThrow()
  })
})
