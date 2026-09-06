import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Environment } from '../../../config/environment.js'
import { InvitationNoticeDelivery, InvitationNoticeRepository } from './invitation-notice.js'

@Injectable()
export class ProcessInvitationNoticesUseCase {
  constructor(private readonly notices: InvitationNoticeRepository, private readonly delivery: InvitationNoticeDelivery, private readonly config: ConfigService<Environment, true>) {}

  async execute(now = new Date()) {
    if (this.config.get('INVITATION_EMAIL_PROVIDER', { infer: true }) !== 'resend' || !this.config.get('SMTP_DELIVERY_ENABLED', { infer: true })) return { processed: 0 }
    let processed = 0
    await this.notices.reviewInterrupted(now)
    for (const candidate of await this.notices.findPending()) {
      const notice = await this.notices.claim(candidate.id, now)
      if (!notice) continue
      // An interrupted/uncertain notification is not blindly replayed.
      const status = await this.delivery.send(notice).catch(() => 'UNCERTAIN' as const)
      await this.notices.finish(notice.id, status)
      processed++
    }
    return { processed }
  }
}
