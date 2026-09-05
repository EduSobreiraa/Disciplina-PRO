import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Environment } from '../../../config/environment.js'
import { InvitationDelivery, type InvitationDeliveryMessage } from '../application/invitation-delivery.js'
import { SmtpClient } from '../application/smtp-client.js'
import { invitationEmail } from './invitation-email.js'

@Injectable()
export class SmtpInvitationDelivery extends InvitationDelivery {
  private readonly logger = new Logger(SmtpInvitationDelivery.name)
  private readonly acceptanceUrl: string
  private readonly from: string
  private readonly enabled: boolean

  constructor(config: ConfigService<Environment, true>, private readonly smtp: SmtpClient) {
    super()
    this.acceptanceUrl = config.get('INVITATION_ACCEPTANCE_URL', { infer: true })
    this.from = config.get('SMTP_FROM', { infer: true })
    this.enabled = config.get('SMTP_DELIVERY_ENABLED', { infer: true })
  }

  async send(message: InvitationDeliveryMessage) {
    if (!this.enabled) {
      this.logger.warn({ invitationId: message.invitationId }, 'Entrega de convite desabilitada neste ambiente')
      return 'FAILED' as const
    }
    try {
      await this.smtp.send(invitationEmail(message, this.acceptanceUrl, this.from))
      return 'SENT' as const
    } catch {
      this.logger.warn({ invitationId: message.invitationId }, 'Falha ao entregar convite por SMTP')
      return 'FAILED' as const
    }
  }
}
