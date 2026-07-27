import { Injectable } from '@nestjs/common'
import type { CurrentPrincipal } from '../../identity-access/application/authenticated-principal.repository.js'
import { PasswordHasher } from '../../identity-access/application/password-hasher.js'
import { assertPasswordPolicy } from '../../identity-access/domain/identity-policy.js'
import { InvalidInvitationDataError } from '../domain/invitation.errors.js'
import { InvitationAcceptanceRepository } from './invitation-acceptance.repository.js'
import { InvitationTokenService } from './invitation-token.js'

const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u

function validateToken(token: string) {
  if (!INVITATION_TOKEN_PATTERN.test(token)) throw new InvalidInvitationDataError('Token de convite inválido')
  return token
}

@Injectable()
export class AcceptInvitationForNewIdentityUseCase {
  constructor(
    private readonly invitations: InvitationAcceptanceRepository,
    private readonly tokens: InvitationTokenService,
    private readonly passwords: PasswordHasher,
  ) {}

  async execute(input: { token: string; password: string }) {
    validateToken(input.token)
    assertPasswordPolicy(input.password)
    const passwordHash = await this.passwords.hash(input.password.normalize('NFC'))
    return this.invitations.acceptForNewIdentity({
      tokenHash: this.tokens.hash(input.token),
      passwordHash,
      now: new Date(),
    })
  }
}

@Injectable()
export class AcceptInvitationForExistingIdentityUseCase {
  constructor(
    private readonly invitations: InvitationAcceptanceRepository,
    private readonly tokens: InvitationTokenService,
  ) {}

  execute(principal: CurrentPrincipal, token: string) {
    validateToken(token)
    return this.invitations.acceptForExistingIdentity({
      tokenHash: this.tokens.hash(token),
      userId: principal.userId,
      now: new Date(),
    })
  }
}
