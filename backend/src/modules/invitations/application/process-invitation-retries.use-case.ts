import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InvitationRetryRepository } from './invitation-retry.repository.js'
import type { Environment } from '../../../config/environment.js'
import { InvitationTokenService } from './invitation-token.js'
import { InvitationDelivery } from './invitation-delivery.js'

@Injectable()
export class ProcessInvitationRetriesUseCase {
  constructor(
    private readonly retries: InvitationRetryRepository,
    private readonly tokens: InvitationTokenService,
    private readonly delivery: InvitationDelivery,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async execute(now = new Date()) {
    if (this.config.get('INVITATION_EMAIL_PROVIDER', { infer: true }) !== 'resend' || !this.config.get('SMTP_DELIVERY_ENABLED', { infer: true })) return { sent: 0, reviewed: 0, cancelled: 0 }
    // No blind replay after a crash: the previous HTTP outcome is unknown.
    const interrupted = await this.retries.reviewInterrupted(now)
    const result = { sent: 0, reviewed: interrupted, cancelled: 0 }
    const candidates = await this.retries.findDue(now)
    for (const candidate of candidates) {
      const token = this.tokens.generate()
      const message = await this.retries.claim(candidate, token.hash, now)
      if (message === 'cancelled') { result.cancelled++; continue }
      if (!message) continue
      // SMTP/HTTP never runs inside a database transaction.
      const status = await this.delivery.send({ ...message, token: token.plainText }).catch(() => 'FAILED' as const)
      await this.retries.finish(message.retryJobId, status === 'SENT')
      if (status === 'SENT') result.sent++
      else result.reviewed++
    }
    return result
  }
}
