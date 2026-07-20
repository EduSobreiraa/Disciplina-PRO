export class InvalidEmailError extends Error {
  constructor() {
    super('E-mail inválido')
    this.name = 'InvalidEmailError'
  }
}

export class WeakPasswordError extends Error {
  constructor() {
    super('A senha deve possuir entre 15 e 128 caracteres')
    this.name = 'WeakPasswordError'
  }
}

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super('E-mail indisponível')
    this.name = 'EmailAlreadyInUseError'
  }
}

export class BootstrapAlreadyCompletedError extends Error {
  constructor() {
    super('O bootstrap de plataforma já foi concluído')
    this.name = 'BootstrapAlreadyCompletedError'
  }
}

export class BootstrapUserDisabledError extends Error {
  constructor() {
    super('O usuário informado para bootstrap está desabilitado')
    this.name = 'BootstrapUserDisabledError'
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('E-mail ou senha inválidos')
    this.name = 'InvalidCredentialsError'
  }
}
