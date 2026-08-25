import { validateEnvironment } from './environment.js'

describe('validateEnvironment', () => {
  it('normalizes a valid environment', () => {
    const environment = validateEnvironment({ PORT: '4000', NODE_ENV: 'test', DATABASE_POOL_MAX: '7' })
    expect(environment.PORT).toBe(4000)
    expect(environment.NODE_ENV).toBe('test')
    expect(environment.DATABASE_POOL_MAX).toBe(7)
  })

  it('rejects an invalid port', () => {
    expect(() => validateEnvironment({ PORT: 'invalid' })).toThrow('PORT')
  })

  it('requires DATABASE_URL in production', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow('DATABASE_URL')
  })

  it('requires JWT keys and separate token peppers in production', () => {
    const base = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      FRONTEND_URL: 'https://app.disciplina.pro',
      JWT_ISSUER: 'https://api.disciplina.pro',
    }
    expect(() => validateEnvironment(base)).toThrow('JWT_PRIVATE_KEY_BASE64')
    expect(() => validateEnvironment({ ...base, JWT_PRIVATE_KEY_BASE64: 'encoded' })).toThrow('JWT_PUBLIC_KEYS_JSON')
    expect(() => validateEnvironment({ ...base, JWT_PRIVATE_KEY_BASE64: 'encoded', JWT_PUBLIC_KEYS_JSON: '{}' })).toThrow('REFRESH_TOKEN_PEPPER')
    expect(() => validateEnvironment({
      ...base,
      JWT_PRIVATE_KEY_BASE64: 'encoded',
      JWT_PUBLIC_KEYS_JSON: '{}',
      REFRESH_TOKEN_PEPPER: 'a-production-refresh-pepper-32-characters',
    })).toThrow('INVITATION_TOKEN_PEPPER')
  })

  it('requires an exact HTTP origin for the frontend', () => {
    expect(() => validateEnvironment({ FRONTEND_URL: 'https://app.disciplina.pro/' })).toThrow('origem exata')
    expect(() => validateEnvironment({ FRONTEND_URL: 'https://app.disciplina.pro/login' })).toThrow('origem exata')
    expect(() => validateEnvironment({ FRONTEND_URL: 'file:///tmp/frontend' })).toThrow('usar HTTP(S)')
  })

  it('requires HTTPS origins in production', () => {
    const production = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_PRIVATE_KEY_BASE64: 'encoded',
      JWT_PUBLIC_KEYS_JSON: '{}',
      REFRESH_TOKEN_PEPPER: 'a-production-pepper-with-32-characters',
      INVITATION_TOKEN_PEPPER: 'another-production-pepper-with-32-characters',
      SMTP_HOST: 'smtp.example.test',
      SMTP_AUTH_USER: 'smtp-user',
      SMTP_AUTH_PASSWORD: 'smtp-password',
      SMTP_FROM: 'Disciplina PRO <no-reply@example.test>',
      SMTP_REQUIRE_TLS: 'true',
    }
    expect(() => validateEnvironment({ ...production, FRONTEND_URL: 'http://app.disciplina.pro', JWT_ISSUER: 'https://api.disciplina.pro' })).toThrow(
      'FRONTEND_URL deve usar HTTPS',
    )
    expect(() => validateEnvironment({ ...production, FRONTEND_URL: 'https://app.disciplina.pro', JWT_ISSUER: 'http://api.disciplina.pro' })).toThrow(
      'JWT_ISSUER deve usar HTTPS',
    )
  })

  it('requires a PostgreSQL database URL', () => {
    expect(() => validateEnvironment({ DATABASE_URL: 'https://database.example/db' })).toThrow('protocolo postgresql://')
  })

  it('requires a positive database pool limit', () => {
    expect(() => validateEnvironment({ DATABASE_POOL_MAX: '0' })).toThrow('DATABASE_POOL_MAX')
  })

  it('validates SMTP transport and invitation URL settings', () => {
    const environment = validateEnvironment({ SMTP_PORT: '2525', SMTP_SECURE: 'true', SMTP_REQUIRE_TLS: 'true', SMTP_AUTH_USER: 'smtp-user', SMTP_AUTH_PASSWORD: 'smtp-password', INVITATION_ACCEPTANCE_URL: 'https://app.example.test/invitations' })
    expect(environment).toMatchObject({ SMTP_PORT: 2525, SMTP_SECURE: true, SMTP_REQUIRE_TLS: true, SMTP_AUTH_USER: 'smtp-user', SMTP_AUTH_PASSWORD: 'smtp-password', INVITATION_ACCEPTANCE_URL: 'https://app.example.test/invitations' })
    expect(() => validateEnvironment({ SMTP_SECURE: 'yes' })).toThrow('SMTP_SECURE')
  })

  it('requires authenticated TLS SMTP and disables Swagger by default in production', () => {
    const production = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      FRONTEND_URL: 'https://staging.example.test',
      JWT_ISSUER: 'https://staging.example.test',
      JWT_PRIVATE_KEY_BASE64: 'encoded',
      JWT_PUBLIC_KEYS_JSON: '{}',
      REFRESH_TOKEN_PEPPER: 'a-production-pepper-with-32-characters',
      INVITATION_TOKEN_PEPPER: 'another-production-pepper-with-32-characters',
      INVITATION_ACCEPTANCE_URL: 'https://staging.example.test/convites/aceitar',
    }
    expect(() => validateEnvironment(production)).toThrow('SMTP_HOST')
    expect(() => validateEnvironment({ ...production, SMTP_HOST: 'smtp.example.test', SMTP_AUTH_USER: 'user', SMTP_AUTH_PASSWORD: 'password', SMTP_FROM: 'Disciplina PRO <no-reply@example.test>' })).toThrow('SMTP_REQUIRE_TLS')
    expect(validateEnvironment({ ...production, SMTP_HOST: 'smtp.example.test', SMTP_AUTH_USER: 'user', SMTP_AUTH_PASSWORD: 'password', SMTP_FROM: 'Disciplina PRO <no-reply@example.test>', SMTP_REQUIRE_TLS: 'true' }).SWAGGER_ENABLED).toBe(false)
  })
})
