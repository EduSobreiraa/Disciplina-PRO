import { Injectable } from '@nestjs/common'
import { InvalidRefreshTokenError } from '../domain/session.errors.js'
import { RefreshTokenService } from './refresh-token.js'
import { SessionRepository } from './session.repository.js'

@Injectable()
export class ResolveRefreshSessionUseCase {
  constructor(private readonly sessions: SessionRepository, private readonly refreshTokens: RefreshTokenService) {}

  async execute(refreshToken: string) {
    const sessionId = await this.sessions.findSessionIdByRefreshTokenHash(this.refreshTokens.hash(refreshToken))
    if (!sessionId) throw new InvalidRefreshTokenError()
    return sessionId
  }
}
