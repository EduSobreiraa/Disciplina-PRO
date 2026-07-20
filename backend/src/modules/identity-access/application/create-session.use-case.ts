import { Injectable } from '@nestjs/common'
import { AccessTokenService } from './access-token.js'
import { Clock } from './clock.js'
import { RefreshTokenService } from './refresh-token.js'
import { SessionRepository } from './session.repository.js'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const REFRESH_INACTIVITY_DAYS = 7
const SESSION_ABSOLUTE_DAYS = 30

@Injectable()
export class CreateSessionUseCase {
  constructor(
    private readonly repository: SessionRepository,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly clock: Clock,
  ) {}

  async execute(input: { userId: string }) {
    const now = this.clock.now()
    const refreshToken = this.refreshTokens.generate()
    const refreshExpiresAt = new Date(now.getTime() + REFRESH_INACTIVITY_DAYS * DAY_IN_MILLISECONDS)
    const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_DAYS * DAY_IN_MILLISECONDS)
    const session = await this.repository.create({
      userId: input.userId,
      refreshTokenHash: refreshToken.hash,
      refreshExpiresAt,
      absoluteExpiresAt,
      now,
    })
    let accessToken: Awaited<ReturnType<AccessTokenService['issue']>>
    try {
      accessToken = await this.accessTokens.issue({ userId: session.userId, sessionId: session.sessionId, now })
    } catch (error) {
      await this.repository.revokeSession({ sessionId: session.sessionId, reason: 'TOKEN_ISSUE_FAILED', now })
      throw error
    }

    return {
      sessionId: session.sessionId,
      accessToken: accessToken.token,
      accessExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.plainText,
      refreshExpiresAt,
      absoluteExpiresAt,
    }
  }
}
