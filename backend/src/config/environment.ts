const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const
const DEPLOYMENT_STAGES = ['local', 'lab', 'staging', 'production'] as const
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number]

export interface Environment {
  NODE_ENV: NodeEnvironment
  DEPLOYMENT_STAGE: (typeof DEPLOYMENT_STAGES)[number]
  PORT: number
  FRONTEND_URL: string
  DATABASE_URL: string
  DATABASE_POOL_MAX: number
  LOG_LEVEL: (typeof LOG_LEVELS)[number]
  REQUEST_BODY_LIMIT: string
  RATE_LIMIT_TTL_MS: number
  RATE_LIMIT_MAX: number
  TRUST_PROXY_HOPS: number
  JWT_ISSUER: string
  JWT_AUDIENCE: string
  JWT_ACTIVE_KID: string
  JWT_PRIVATE_KEY_BASE64?: string
  JWT_PUBLIC_KEYS_JSON?: string
  REFRESH_TOKEN_PEPPER: string
  INVITATION_TOKEN_PEPPER: string
  INVITATION_ACCEPTANCE_URL: string
  SMTP_HOST: string
  SMTP_PORT: number
  SMTP_SECURE: boolean
  SMTP_REQUIRE_TLS: boolean
  SMTP_DELIVERY_ENABLED: boolean
  SMTP_AUTH_USER?: string
  SMTP_AUTH_PASSWORD?: string
  SMTP_FROM: string
  SWAGGER_ENABLED: boolean
  OUTBOX_WORKER_POLL_INTERVAL_MS: number
  OUTBOX_WORKER_ERROR_DELAY_MS: number
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

function parseNonEmptyString(value: unknown, fallback: string, name: string) {
  const parsed = parseString(value, fallback, name).trim()
  if (!parsed) throw new Error(`${name} não pode ser vazia`)
  return parsed
}

function parseChoice<T extends string>(value: unknown, fallback: T, choices: readonly T[], name: string) {
  const parsed = parseString(value, fallback, name) as T
  if (!choices.includes(parsed)) throw new Error(`${name} deve ser um de: ${choices.join(', ')}`)
  return parsed
}

function parseBoolean(value: unknown, fallback: boolean, name: string) {
  const parsed = value ?? fallback
  if (parsed === true || parsed === 'true') return true
  if (parsed === false || parsed === 'false') return false
  throw new Error(`${name} deve ser true ou false`)
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

function parseWebUrl(value: unknown, fallback: string, name: string, requireHttps: boolean) {
  const parsed = parseUrl(value, fallback, name)
  const url = new URL(parsed)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${name} deve usar HTTP(S)`)
  if (requireHttps && url.protocol !== 'https:') throw new Error(`${name} deve usar HTTPS em produção`)
  return parsed
}

function parseWebOrigin(value: unknown, fallback: string, name: string, requireHttps: boolean) {
  const parsed = parseWebUrl(value, fallback, name, requireHttps)
  if (new URL(parsed).origin !== parsed) throw new Error(`${name} deve ser uma origem exata, sem caminho, query, fragmento ou barra final`)
  return parsed
}

function parseDatabaseUrl(value: unknown, fallback: string) {
  const parsed = parseUrl(value, fallback, 'DATABASE_URL')
  const url = new URL(parsed)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL deve usar o protocolo postgresql:// ou postgres://')
  return parsed
}

function requireProductionValue(raw: Record<string, unknown>, name: string) {
  const value = raw[name]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} é obrigatória em produção`)
  return value
}

export function validateEnvironment(raw: Record<string, unknown>): Environment {
  const nodeEnvironment = parseChoice(raw.NODE_ENV, 'development', NODE_ENVIRONMENTS, 'NODE_ENV')
  const deploymentStage = parseChoice(raw.DEPLOYMENT_STAGE, nodeEnvironment === 'production' ? 'production' : 'local', DEPLOYMENT_STAGES, 'DEPLOYMENT_STAGE')
  const databaseUrl = raw.DATABASE_URL
  const localDatabaseUrl = `postgresql://${encodeURIComponent(parseString(raw.POSTGRES_USER, 'disciplina_pro', 'POSTGRES_USER'))}:${encodeURIComponent(parseString(raw.POSTGRES_PASSWORD, 'change_me', 'POSTGRES_PASSWORD'))}@localhost:${parseInteger(raw.POSTGRES_PORT, 5432, 'POSTGRES_PORT')}/${encodeURIComponent(parseString(raw.POSTGRES_DB, 'disciplina_pro', 'POSTGRES_DB'))}`

  const swaggerEnabled = parseBoolean(raw.SWAGGER_ENABLED, nodeEnvironment !== 'production', 'SWAGGER_ENABLED')
  const trustProxyHops = parseInteger(raw.TRUST_PROXY_HOPS, 0, 'TRUST_PROXY_HOPS', 0)
  const smtpDeliveryEnabled = parseBoolean(raw.SMTP_DELIVERY_ENABLED, deploymentStage !== 'lab', 'SMTP_DELIVERY_ENABLED')

  if (nodeEnvironment !== 'production' && (deploymentStage === 'staging' || deploymentStage === 'production')) {
    throw new Error('DEPLOYMENT_STAGE staging/production exige NODE_ENV=production')
  }

  if (nodeEnvironment === 'production' && !databaseUrl) throw new Error('DATABASE_URL é obrigatória em produção')
  if (nodeEnvironment === 'production' && !raw.JWT_PRIVATE_KEY_BASE64) throw new Error('JWT_PRIVATE_KEY_BASE64 é obrigatória em produção')
  if (nodeEnvironment === 'production' && !raw.JWT_PUBLIC_KEYS_JSON) throw new Error('JWT_PUBLIC_KEYS_JSON é obrigatória em produção')
  if (nodeEnvironment === 'production' && !raw.REFRESH_TOKEN_PEPPER) throw new Error('REFRESH_TOKEN_PEPPER é obrigatória em produção')
  if (nodeEnvironment === 'production' && !raw.INVITATION_TOKEN_PEPPER) throw new Error('INVITATION_TOKEN_PEPPER é obrigatória em produção')
  if (nodeEnvironment === 'production') {
    requireProductionValue(raw, 'JWT_ACTIVE_KID')
    requireProductionValue(raw, 'JWT_AUDIENCE')
    if ((deploymentStage === 'staging' || deploymentStage === 'production') && !smtpDeliveryEnabled) {
      throw new Error('SMTP_DELIVERY_ENABLED deve ser true em staging/produção')
    }
    if (smtpDeliveryEnabled) {
      requireProductionValue(raw, 'SMTP_HOST')
      requireProductionValue(raw, 'SMTP_AUTH_USER')
      requireProductionValue(raw, 'SMTP_AUTH_PASSWORD')
      requireProductionValue(raw, 'SMTP_FROM')
      if (raw.SMTP_REQUIRE_TLS !== true && raw.SMTP_REQUIRE_TLS !== 'true') throw new Error('SMTP_REQUIRE_TLS deve ser true em produção')
    }
    if (swaggerEnabled) throw new Error('SWAGGER_ENABLED deve ser false em produção até existir controle de acesso dedicado')
    if (trustProxyHops < 1) throw new Error('TRUST_PROXY_HOPS deve ser configurada explicitamente em produção')
  }

  const requestBodyLimit = parseString(raw.REQUEST_BODY_LIMIT, '100kb', 'REQUEST_BODY_LIMIT')
  if (!/^\d+(?:b|kb|mb)$/i.test(requestBodyLimit)) throw new Error('REQUEST_BODY_LIMIT deve usar b, kb ou mb')

  const refreshTokenPepper = parseString(raw.REFRESH_TOKEN_PEPPER, 'development-only-refresh-pepper-change-me', 'REFRESH_TOKEN_PEPPER')
  if (refreshTokenPepper.length < 32) throw new Error('REFRESH_TOKEN_PEPPER deve possuir ao menos 32 caracteres')
  const invitationTokenPepper = parseString(raw.INVITATION_TOKEN_PEPPER, 'development-only-invitation-pepper-change-me', 'INVITATION_TOKEN_PEPPER')
  if (invitationTokenPepper.length < 32) throw new Error('INVITATION_TOKEN_PEPPER deve possuir ao menos 32 caracteres')
  if (invitationTokenPepper === refreshTokenPepper) throw new Error('INVITATION_TOKEN_PEPPER deve ser diferente de REFRESH_TOKEN_PEPPER')
  if (nodeEnvironment === 'production' && (refreshTokenPepper.startsWith('development-only-') || invitationTokenPepper.startsWith('development-only-'))) {
    throw new Error('Peppers de desenvolvimento não podem ser usados em produção')
  }

  const jwtActiveKid = parseNonEmptyString(raw.JWT_ACTIVE_KID, 'local-ephemeral', 'JWT_ACTIVE_KID')
  if (!/^[A-Za-z0-9._-]{1,64}$/u.test(jwtActiveKid)) throw new Error('JWT_ACTIVE_KID deve usar apenas letras, números, ponto, hífen ou underscore e possuir até 64 caracteres')

  return {
    NODE_ENV: nodeEnvironment,
    DEPLOYMENT_STAGE: deploymentStage,
    PORT: parseInteger(raw.PORT, 3000, 'PORT'),
    FRONTEND_URL: parseWebOrigin(raw.FRONTEND_URL, 'http://localhost:5173', 'FRONTEND_URL', nodeEnvironment === 'production'),
    DATABASE_URL: parseDatabaseUrl(databaseUrl, localDatabaseUrl),
    DATABASE_POOL_MAX: parseInteger(raw.DATABASE_POOL_MAX, 5, 'DATABASE_POOL_MAX'),
    LOG_LEVEL: parseChoice(raw.LOG_LEVEL, 'info', LOG_LEVELS, 'LOG_LEVEL'),
    REQUEST_BODY_LIMIT: requestBodyLimit,
    RATE_LIMIT_TTL_MS: parseInteger(raw.RATE_LIMIT_TTL_MS, 60_000, 'RATE_LIMIT_TTL_MS'),
    RATE_LIMIT_MAX: parseInteger(raw.RATE_LIMIT_MAX, 100, 'RATE_LIMIT_MAX'),
    TRUST_PROXY_HOPS: trustProxyHops,
    JWT_ISSUER: parseWebUrl(raw.JWT_ISSUER, 'http://localhost:3000', 'JWT_ISSUER', nodeEnvironment === 'production'),
    JWT_AUDIENCE: parseNonEmptyString(raw.JWT_AUDIENCE, 'disciplina-pro-api', 'JWT_AUDIENCE'),
    JWT_ACTIVE_KID: jwtActiveKid,
    JWT_PRIVATE_KEY_BASE64: raw.JWT_PRIVATE_KEY_BASE64 ? parseString(raw.JWT_PRIVATE_KEY_BASE64, '', 'JWT_PRIVATE_KEY_BASE64') : undefined,
    JWT_PUBLIC_KEYS_JSON: raw.JWT_PUBLIC_KEYS_JSON ? parseString(raw.JWT_PUBLIC_KEYS_JSON, '', 'JWT_PUBLIC_KEYS_JSON') : undefined,
    REFRESH_TOKEN_PEPPER: refreshTokenPepper,
    INVITATION_TOKEN_PEPPER: invitationTokenPepper,
    INVITATION_ACCEPTANCE_URL: parseWebUrl(raw.INVITATION_ACCEPTANCE_URL, 'http://localhost:5173/convites/aceitar', 'INVITATION_ACCEPTANCE_URL', nodeEnvironment === 'production'),
    SMTP_HOST: parseString(raw.SMTP_HOST, 'localhost', 'SMTP_HOST'),
    SMTP_PORT: parseInteger(raw.SMTP_PORT, 1025, 'SMTP_PORT'),
    SMTP_SECURE: parseBoolean(raw.SMTP_SECURE, false, 'SMTP_SECURE'),
    SMTP_REQUIRE_TLS: parseBoolean(raw.SMTP_REQUIRE_TLS, false, 'SMTP_REQUIRE_TLS'),
    SMTP_DELIVERY_ENABLED: smtpDeliveryEnabled,
    SMTP_AUTH_USER: raw.SMTP_AUTH_USER ? parseString(raw.SMTP_AUTH_USER, '', 'SMTP_AUTH_USER') : undefined,
    SMTP_AUTH_PASSWORD: raw.SMTP_AUTH_PASSWORD ? parseString(raw.SMTP_AUTH_PASSWORD, '', 'SMTP_AUTH_PASSWORD') : undefined,
    SMTP_FROM: parseString(raw.SMTP_FROM, 'Disciplina PRO <no-reply@disciplina.local>', 'SMTP_FROM'),
    SWAGGER_ENABLED: swaggerEnabled,
    OUTBOX_WORKER_POLL_INTERVAL_MS: parseInteger(raw.OUTBOX_WORKER_POLL_INTERVAL_MS, 1_000, 'OUTBOX_WORKER_POLL_INTERVAL_MS', 250),
    OUTBOX_WORKER_ERROR_DELAY_MS: parseInteger(raw.OUTBOX_WORKER_ERROR_DELAY_MS, 5_000, 'OUTBOX_WORKER_ERROR_DELAY_MS', 250),
  }
}
