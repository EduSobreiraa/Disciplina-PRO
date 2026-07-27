import { jest } from '@jest/globals'
import { WeakPasswordError } from '../../identity-access/domain/identity.errors.js'
import { InvalidInvitationDataError } from '../domain/invitation.errors.js'
import { AcceptInvitationForExistingIdentityUseCase, AcceptInvitationForNewIdentityUseCase } from './invitation-acceptance.use-cases.js'
import { InvitationAcceptanceRepository } from './invitation-acceptance.repository.js'
import { InvitationTokenService } from './invitation-token.js'

const TOKEN = 'a'.repeat(43)
const HASH = 'b'.repeat(64)
const PASSWORD = 'uma senha suficientemente segura'

function collaborators() {
  return {
    repository: {
      acceptForNewIdentity: jest.fn<InvitationAcceptanceRepository['acceptForNewIdentity']>(),
      acceptForExistingIdentity: jest.fn<InvitationAcceptanceRepository['acceptForExistingIdentity']>(),
    },
    tokens: {
      generate: jest.fn<InvitationTokenService['generate']>(),
      hash: jest.fn<InvitationTokenService['hash']>(() => HASH),
    },
    passwords: {
      hash: jest.fn(() => Promise.resolve('argon2-hash')),
      verify: jest.fn(() => Promise.resolve(false)),
    },
  }
}

describe('invitation acceptance use cases', () => {
  it('validates and hashes password and token before accepting a new identity', async () => {
    const { repository, tokens, passwords } = collaborators()
    repository.acceptForNewIdentity.mockResolvedValue({} as never)
    await new AcceptInvitationForNewIdentityUseCase(repository, tokens, passwords).execute({ token: TOKEN, password: PASSWORD })
    expect(passwords.hash).toHaveBeenCalledWith(PASSWORD)
    expect(tokens.hash).toHaveBeenCalledWith(TOKEN)
    expect(repository.acceptForNewIdentity).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: HASH, passwordHash: 'argon2-hash', now: expect.any(Date) as Date }))
  })

  it('rejects malformed tokens and weak passwords before persistence', async () => {
    const { repository, tokens, passwords } = collaborators()
    const useCase = new AcceptInvitationForNewIdentityUseCase(repository, tokens, passwords)
    await expect(useCase.execute({ token: 'invalid', password: PASSWORD })).rejects.toBeInstanceOf(InvalidInvitationDataError)
    await expect(useCase.execute({ token: TOKEN, password: 'short' })).rejects.toBeInstanceOf(WeakPasswordError)
    expect(repository.acceptForNewIdentity).not.toHaveBeenCalled()
  })

  it('binds existing acceptance exclusively to the authenticated user', async () => {
    const { repository, tokens } = collaborators()
    repository.acceptForExistingIdentity.mockResolvedValue({} as never)
    const principal = { userId: 'trusted-user', sessionId: 'session', tokenId: 'token-id' }
    await new AcceptInvitationForExistingIdentityUseCase(repository, tokens).execute(principal, TOKEN)
    expect(repository.acceptForExistingIdentity).toHaveBeenCalledWith(expect.objectContaining({ userId: 'trusted-user', tokenHash: HASH }))
  })
})
