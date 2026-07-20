import { Injectable } from '@nestjs/common'
import { Clock } from './clock.js'
import { SessionRepository } from './session.repository.js'

@Injectable()
export class RevokeAllSessionsUseCase {
  constructor(
    private readonly repository: SessionRepository,
    private readonly clock: Clock,
  ) {}

  execute(input: { userId: string; reason?: string }) {
    return this.repository.revokeAllForUser({ userId: input.userId, reason: input.reason ?? 'LOGOUT_ALL', now: this.clock.now() })
  }
}
