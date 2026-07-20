import { Injectable } from '@nestjs/common'
import { Clock } from './clock.js'
import { SessionRepository } from './session.repository.js'

@Injectable()
export class RevokeSessionUseCase {
  constructor(
    private readonly repository: SessionRepository,
    private readonly clock: Clock,
  ) {}

  execute(input: { sessionId: string; reason?: string }) {
    return this.repository.revokeSession({ sessionId: input.sessionId, reason: input.reason ?? 'LOGOUT', now: this.clock.now() })
  }
}
