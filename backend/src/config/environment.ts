const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number]

export interface Environment {
  NODE_ENV: NodeEnvironment
  PORT: number
  FRONTEND_URL: string
  DATABASE_URL: string
  LOG_LEVEL: (typeof LOG_LEVELS)[number]
  REQUEST_BODY_LIMIT: string
  RATE_LIMIT_TTL_MS: number
  RATE_LIMIT_MAX: number
  JWT_ISSUER: string
  JWT_AUDIENCE: string
  JWT_ACTIVE_KID: string
  JWT_PRIVATE_KEY_BASE64?: string
  JWT_PUBLIC_KEYS_JSON?: string
  REFRESH_TOKEN_PEPPER: string
}

function parseInteger(value: unknown, fallback: number, name: string, minimum = 1) {
  const parsed = Number(value ?? fallback)
  if (!Number.isInteger(parsed) || parsed < minimum) throw new Error(`${name} deve ser um inteiro maior ou igual a ${minimum}`)
  return parsed
}

function parseString(value: unknown, fallback: string, name: string) {
  const candidate = value ?? fallback
  if (typeof candidate !== 'string' && typeof candidate !== 'number') throw new Error(`${name} deve ser texto`)
  return String(candidate)
}

function parseChoice<T extends string>(value: unknown, fallback: T, choices: readonly T[], name: string) {
  const parsed = parseString(value, fallback, name) as T
  if (!choices.includes(parsed)) throw new Error(`${name} deve ser um de: ${choices.join(', ')}`)
  return parsed
}

function parseUrl(value: unknown, fallback: string, name: string) {
  const parsed = parseString(value, fallback, name)
  try {
    new URL(parsed)
  } catch {
    throw new Error(`${name} deve ser uma URL válida`)
  }
  return parsed
}

export function validateEnvironment(raw: Record<string, unknown>): Environment {
  const nodeEnvironment = parseChoice(raw.NODE_ENV, 'development', NODE_ENVIRONMENTS, 'NODE_ENV')
  const databaseUrl = raw.DATABASE_URL
  const localDatabaseUrl = `postgresql://${encodeURIComponent(parseString(raw.POSTGRES_USER, 'disciplina_pro', 'POSTGRES_USER'))}:${encodeURIComponent(parseString(raw.POSTGRES_PASSWORD, 'change_me', 'POSTGRES_PASSWORD'))}@localhost:${parseInteger(raw.POSTGRES_PORT, 5432, 'POSTGRES_PORT')}/${encodeURIComponent(parseString(raw.POSTGRES_DB, 'disciplina_pro', 'POSTGRES_DB'))}`

  if (nodeEnvironment === 'production' && !databaseUrl) throw new Error('DATABASE_URL é obrigatória em produção')
  if (nodeEnvironment === 'production' && !raw.JWT_PRIVATE_KEY_BASE64) throw new Error('JWT_PRIVATE_KEY_BASE64 é obrigatória em produção')
  if (nodeEnvironment === 'production' && !raw.JWT_PUBLIC_KEYS_JSON) throw new Error('JWT_PUBLIC_KEYS_JSON é obrigatória em produção')
  if (nodeEnvironment === 'production' && !raw.REFRESH_TOKEN_PEPPER) throw new Error('REFRESH_TOKEN_PEPPER é obrigatória em produção')

  const requestBodyLimit = parseString(raw.REQUEST_BODY_LIMIT, '100kb', 'REQUEST_BODY_LIMIT')
  if (!/^\d+(?:b|kb|mb)$/i.test(requestBodyLimit)) throw new Error('REQUEST_BODY_LIMIT deve usar b, kb ou mb')

  const refreshTokenPepper = parseString(raw.REFRESH_TOKEN_PEPPER, 'development-only-refresh-pepper-change-me', 'REFRESH_TOKEN_PEPPER')
  if (refreshTokenPepper.length < 32) throw new Error('REFRESH_TOKEN_PEPPER deve possuir ao menos 32 caracteres')

  return {
    NODE_ENV: nodeEnvironment,
    PORT: parseInteger(raw.PORT, 3000, 'PORT'),
    FRONTEND_URL: parseUrl(raw.FRONTEND_URL, 'http://localhost:5173', 'FRONTEND_URL'),
    DATABASE_URL: parseUrl(databaseUrl, localDatabaseUrl, 'DATABASE_URL'),
    LOG_LEVEL: parseChoice(raw.LOG_LEVEL, 'info', LOG_LEVELS, 'LOG_LEVEL'),
    REQUEST_BODY_LIMIT: requestBodyLimit,
    RATE_LIMIT_TTL_MS: parseInteger(raw.RATE_LIMIT_TTL_MS, 60_000, 'RATE_LIMIT_TTL_MS'),
    RATE_LIMIT_MAX: parseInteger(raw.RATE_LIMIT_MAX, 100, 'RATE_LIMIT_MAX'),
    JWT_ISSUER: parseUrl(raw.JWT_ISSUER, 'http://localhost:3000', 'JWT_ISSUER'),
    JWT_AUDIENCE: parseString(raw.JWT_AUDIENCE, 'disciplina-pro-api', 'JWT_AUDIENCE'),
    JWT_ACTIVE_KID: parseString(raw.JWT_ACTIVE_KID, 'local-ephemeral', 'JWT_ACTIVE_KID'),
    JWT_PRIVATE_KEY_BASE64: raw.JWT_PRIVATE_KEY_BASE64 ? parseString(raw.JWT_PRIVATE_KEY_BASE64, '', 'JWT_PRIVATE_KEY_BASE64') : undefined,
    JWT_PUBLIC_KEYS_JSON: raw.JWT_PUBLIC_KEYS_JSON ? parseString(raw.JWT_PUBLIC_KEYS_JSON, '', 'JWT_PUBLIC_KEYS_JSON') : undefined,
    REFRESH_TOKEN_PEPPER: refreshTokenPepper,
  }
}
