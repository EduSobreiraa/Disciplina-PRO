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
})
