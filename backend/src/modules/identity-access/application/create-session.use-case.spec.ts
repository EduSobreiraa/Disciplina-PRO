import { jest } from '@jest/globals'
import { CreateSessionUseCase } from './create-session.use-case.js'

describe('CreateSessionUseCase', () => {
  it('persists only the refresh hash and returns the opaque token once', async () => {
    const now = new Date('2026-07-20T12:00:00.000Z')
    const repository = {
      create: jest.fn<() => Promise<{ sessionId: string; userId: string; absoluteExpiresAt: Date }>>(),
      revokeSession: jest.fn<() => Promise<void>>(),
    }
    const accessTokens = { issue: jest.fn<() => Promise<{ token: string; expiresAt: Date }>>() }
    const refreshTokens = { generate: jest.fn(), hash: jest.fn() }
    const clock = { now: () => now }
    repository.create.mockResolvedValueOnce({ sessionId: 'session-id', userId: 'user-id', absoluteExpiresAt: new Date('2026-08-19T12:00:00.000Z') })
    accessTokens.issue.mockResolvedValueOnce({ token: 'access-token', expiresAt: new Date('2026-07-20T12:10:00.000Z') })
    refreshTokens.generate.mockReturnValueOnce({ plainText: 'secret-refresh-token', hash: 'stored-hash' })
    const useCase = new CreateSessionUseCase(repository as never, accessTokens as never, refreshTokens as never, clock)

    const result = await useCase.execute({ userId: 'user-id' })

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ refreshTokenHash: 'stored-hash' }))
    expect(repository.create).not.toHaveBeenCalledWith(expect.objectContaining({ refreshTokenHash: 'secret-refresh-token' }))
    expect(result.refreshToken).toBe('secret-refresh-token')
  })

  it('revokes the persisted session when access-token signing fails', async () => {
    const repository = {
      create: jest.fn<() => Promise<{ sessionId: string; userId: string; absoluteExpiresAt: Date }>>(),
      revokeSession: jest.fn<() => Promise<void>>(),
    }
    repository.create.mockResolvedValueOnce({ sessionId: 'session-id', userId: 'user-id', absoluteExpiresAt: new Date('2026-08-19') })
    repository.revokeSession.mockResolvedValueOnce()
    const accessTokens = { issue: jest.fn<() => Promise<never>>().mockRejectedValueOnce(new Error('signing failed')) }
    const refreshTokens = { generate: () => ({ plainText: 'plain', hash: 'hash' }), hash: jest.fn() }
    const clock = { now: () => new Date('2026-07-20') }
    const useCase = new CreateSessionUseCase(repository as never, accessTokens as never, refreshTokens as never, clock)

    await expect(useCase.execute({ userId: 'user-id' })).rejects.toThrow('signing failed')
    expect(repository.revokeSession).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'session-id', reason: 'TOKEN_ISSUE_FAILED' }))
  })
})
