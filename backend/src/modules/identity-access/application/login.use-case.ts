import { Injectable } from '@nestjs/common'
import { InvalidCredentialsError } from '../domain/identity.errors.js'
import { normalizeEmail } from '../domain/identity-policy.js'
import { CreateSessionUseCase } from './create-session.use-case.js'
import { IdentityRepository } from './identity.repository.js'
import { PasswordHasher } from './password-hasher.js'

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly identities: IdentityRepository,
    private readonly passwords: PasswordHasher,
    private readonly sessions: CreateSessionUseCase,
  ) {}

  async execute(input: { email: string; password: string }) {
    let identity
    try {
      identity = await this.identities.findForLogin(normalizeEmail(input.email))
    } catch {
      identity = null
    }
    if (!identity) {
      await this.passwords.hash(input.password.normalize('NFC'))
      throw new InvalidCredentialsError()
    }
    const valid = await this.passwords.verify(identity.passwordHash, input.password.normalize('NFC'))
    if (!valid || identity.status !== 'ACTIVE') throw new InvalidCredentialsError()
    return this.sessions.execute({ userId: identity.id })
  }
}
