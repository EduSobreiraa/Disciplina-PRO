import { validateEnvironment } from './environment.js'

describe('validateEnvironment', () => {
  it('normalizes a valid environment', () => {
    const environment = validateEnvironment({ PORT: '4000', NODE_ENV: 'test' })
    expect(environment.PORT).toBe(4000)
    expect(environment.NODE_ENV).toBe('test')
  })

  it('rejects an invalid port', () => {
    expect(() => validateEnvironment({ PORT: 'invalid' })).toThrow('PORT')
  })

  it('requires DATABASE_URL in production', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow('DATABASE_URL')
  })

  it('requires JWT keys and refresh pepper in production', () => {
    const base = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://user:pass@localhost:5432/db' }
    expect(() => validateEnvironment(base)).toThrow('JWT_PRIVATE_KEY_BASE64')
    expect(() => validateEnvironment({ ...base, JWT_PRIVATE_KEY_BASE64: 'encoded' })).toThrow('JWT_PUBLIC_KEYS_JSON')
    expect(() => validateEnvironment({ ...base, JWT_PRIVATE_KEY_BASE64: 'encoded', JWT_PUBLIC_KEYS_JSON: '{}' })).toThrow('REFRESH_TOKEN_PEPPER')
  })
})
