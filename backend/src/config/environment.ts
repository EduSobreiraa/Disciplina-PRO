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

  const requestBodyLimit = parseString(raw.REQUEST_BODY_LIMIT, '100kb', 'REQUEST_BODY_LIMIT')
  if (!/^\d+(?:b|kb|mb)$/i.test(requestBodyLimit)) throw new Error('REQUEST_BODY_LIMIT deve usar b, kb ou mb')

  return {
    NODE_ENV: nodeEnvironment,
    PORT: parseInteger(raw.PORT, 3000, 'PORT'),
    FRONTEND_URL: parseUrl(raw.FRONTEND_URL, 'http://localhost:5173', 'FRONTEND_URL'),
    DATABASE_URL: parseUrl(databaseUrl, localDatabaseUrl, 'DATABASE_URL'),
    LOG_LEVEL: parseChoice(raw.LOG_LEVEL, 'info', LOG_LEVELS, 'LOG_LEVEL'),
    REQUEST_BODY_LIMIT: requestBodyLimit,
    RATE_LIMIT_TTL_MS: parseInteger(raw.RATE_LIMIT_TTL_MS, 60_000, 'RATE_LIMIT_TTL_MS'),
    RATE_LIMIT_MAX: parseInteger(raw.RATE_LIMIT_MAX, 100, 'RATE_LIMIT_MAX'),
  }
}
