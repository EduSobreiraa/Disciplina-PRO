export class UserNotEligibleForSessionError extends Error {
  constructor() {
    super('Usuário indisponível para autenticação')
    this.name = 'UserNotEligibleForSessionError'
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Sessão inválida ou expirada')
    this.name = 'InvalidRefreshTokenError'
  }
}

export class RefreshTokenReuseError extends Error {
  constructor() {
    super('Reutilização de credencial de sessão detectada')
    this.name = 'RefreshTokenReuseError'
  }
}

export class InvalidAccessTokenError extends Error {
  constructor() {
    super('Access token inválido')
    this.name = 'InvalidAccessTokenError'
  }
}

export class JwtKeyConfigurationError extends Error {
  constructor(message = 'Configuração de chaves JWT inválida') {
    super(message)
    this.name = 'JwtKeyConfigurationError'
  }
}
