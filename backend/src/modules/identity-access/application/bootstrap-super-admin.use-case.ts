import { Injectable } from '@nestjs/common'
import { assertPasswordPolicy, normalizeEmail } from '../domain/identity-policy.js'
import { IdentityRepository } from './identity.repository.js'
import { PasswordHasher } from './password-hasher.js'

@Injectable()
export class BootstrapSuperAdminUseCase {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: { email: string; password: string }) {
    const normalizedEmail = normalizeEmail(input.email)
    assertPasswordPolicy(input.password)
    const passwordHash = await this.passwordHasher.hash(input.password.normalize('NFC'))
    return this.repository.bootstrapSuperAdmin({ email: input.email.trim(), normalizedEmail, passwordHash })
  }
}
