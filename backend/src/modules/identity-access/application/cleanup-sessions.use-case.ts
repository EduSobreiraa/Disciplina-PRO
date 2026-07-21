import { Injectable } from '@nestjs/common'
import { Clock } from './clock.js'
import { SessionRepository } from './session.repository.js'

const RETENTION_DAYS = 90
const DAY_IN_MILLISECONDS = 86_400_000

@Injectable()
export class CleanupSessionsUseCase {
  constructor(private readonly sessions: SessionRepository, private readonly clock: Clock) {}
  execute() {
    const now = this.clock.now()
    return this.sessions.cleanup({ now, purgeBefore: new Date(now.getTime() - RETENTION_DAYS * DAY_IN_MILLISECONDS) })
  }
}
