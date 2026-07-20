import { Injectable } from '@nestjs/common'
import { InvalidRefreshTokenError, RefreshTokenReuseError } from '../domain/session.errors.js'
import { AccessTokenService } from './access-token.js'
import { Clock } from './clock.js'
import { RefreshTokenService } from './refresh-token.js'
import { SessionRepository } from './session.repository.js'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const REFRESH_INACTIVITY_DAYS = 7

@Injectable()
export class RotateSessionUseCase {
  constructor(
    private readonly repository: SessionRepository,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly clock: Clock,
  ) {}

  async execute(input: { refreshToken: string }) {
    const now = this.clock.now()
    const nextRefreshToken = this.refreshTokens.generate()
    const currentTokenHash = this.refreshTokens.hash(input.refreshToken)
    const proposedExpiry = new Date(now.getTime() + REFRESH_INACTIVITY_DAYS * DAY_IN_MILLISECONDS)
    const result = await this.repository.rotate({ currentTokenHash, nextTokenHash: nextRefreshToken.hash, nextExpiresAt: proposedExpiry, now })

    if (result.status === 'reuse') throw new RefreshTokenReuseError()
    if (result.status === 'invalid') throw new InvalidRefreshTokenError()

    const refreshExpiresAt = result.session.absoluteExpiresAt < proposedExpiry ? result.session.absoluteExpiresAt : proposedExpiry
    let accessToken: Awaited<ReturnType<AccessTokenService['issue']>>
    try {
      accessToken = await this.accessTokens.issue({ userId: result.session.userId, sessionId: result.session.sessionId, now })
    } catch (error) {
      await this.repository.revokeSession({ sessionId: result.session.sessionId, reason: 'TOKEN_ISSUE_FAILED', now })
      throw error
    }
    return {
      sessionId: result.session.sessionId,
      accessToken: accessToken.token,
      accessExpiresAt: accessToken.expiresAt,
      refreshToken: nextRefreshToken.plainText,
      refreshExpiresAt,
      absoluteExpiresAt: result.session.absoluteExpiresAt,
    }
  }
}
