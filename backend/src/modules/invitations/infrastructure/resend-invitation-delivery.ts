import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Environment } from '../../../config/environment.js'
import { InvitationDelivery, type InvitationDeliveryMessage } from '../application/invitation-delivery.js'
import { invitationEmail } from './invitation-email.js'
import { ResendDeliveryRepository } from '../application/resend-delivery.repository.js'
import { InvitationTokenService } from '../application/invitation-token.js'

type FailureReason = 'TEMPORARY' | 'PERMANENT' | 'AMBIGUOUS'

class ResendRejectedError extends Error {
  constructor(readonly reason: FailureReason) {
    super('RESEND_REJECTED')
  }
}

function providerErrorName(error: unknown) {
  return error && typeof error === 'object' && 'name' in error ? error.name : undefined
}

function classifyRejection(status: number, name: unknown): FailureReason {
  if ((status === 429 && name === 'rate_limit_exceeded') || (status === 503 && name === 'service_unavailable')) return 'TEMPORARY'
  if (status >= 400 && status < 500 && status !== 409) return 'PERMANENT'
  return 'AMBIGUOUS'
}

async function assertResendAccepted(response: Response) {
  if (response.ok) return
  const error: unknown = await response.json().catch(() => null)
  throw new ResendRejectedError(classifyRejection(response.status, providerErrorName(error)))
}

function resendMessageId(result: unknown) {
  if (!result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string' || !result.id) {
    throw new Error('RESEND_INVALID_RESPONSE')
  }
  return result.id
}

function isRecipientAllowed(stage: Environment['DEPLOYMENT_STAGE'], allowedRecipient: string | undefined, recipient: string) {
  if (stage !== 'local' && stage !== 'lab') return true
  return recipient.toLowerCase() === allowedRecipient?.toLowerCase()
}

@Injectable()
export class ResendInvitationDelivery extends InvitationDelivery {
  private readonly logger = new Logger(ResendInvitationDelivery.name)

  constructor(private readonly config: ConfigService<Environment, true>, private readonly deliveries: ResendDeliveryRepository, private readonly tokens: InvitationTokenService) { super() }

  private async sendToResend(message: InvitationDeliveryMessage) {
    const payload = invitationEmail(message, this.config.get('INVITATION_ACCEPTANCE_URL', { infer: true }), this.config.get('RESEND_FROM', { infer: true }))
    const body = JSON.stringify(payload)
    // Identical attempts share a key; rotation of the token creates a new one.
    // No plaintext token, address or API key in metadata or logs.
    const idempotencyKey = `invitation-${message.invitationId}-${createHash('sha256').update(body).digest('hex')}`
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.get('RESEND_API_KEY', { infer: true })}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    })
    // Never log provider response bodies: they can contain private message data.
    await assertResendAccepted(response)
    return resendMessageId(await response.json())
  }

  async send(message: InvitationDeliveryMessage): Promise<'SENT' | 'FAILED'> {
    if (!this.config.get('SMTP_DELIVERY_ENABLED', { infer: true })) return 'FAILED'
    const stage = this.config.get('DEPLOYMENT_STAGE', { infer: true })
    const allowedRecipient = this.config.get('RESEND_TEST_RECIPIENT', { infer: true })
    // Fail closed in local/lab, and never redirect another person's invitation.
    if (!isRecipientAllowed(stage, allowedRecipient, message.email)) {
      this.logger.warn({ invitationId: message.invitationId }, 'Destinatário fora do escopo de teste Resend')
      return 'FAILED'
    }
    const tokenHash = this.tokens.hash(message.token)
    try {
      if (await this.deliveries.isSuppressed(message.invitationId)) {
        await this.deliveries.recordFailure(message.invitationId, tokenHash, 'PERMANENT', message.retryJobId)
        return 'FAILED'
      }
      const providerMessageId = await this.sendToResend(message)
      await this.deliveries.recordSent(message.invitationId, providerMessageId, tokenHash)
      // API acceptance is not confirmation of delivery to the mailbox.
      return 'SENT'
    } catch (error) {
      const failureReason = error instanceof ResendRejectedError ? error.reason : 'AMBIGUOUS'
      await this.deliveries.recordFailure(message.invitationId, tokenHash, failureReason, message.retryJobId).catch(() => {
        this.logger.error({ invitationId: message.invitationId }, 'Falha ao persistir o resultado do envio')
      })
      this.logger.warn({ invitationId: message.invitationId }, 'Falha ao enviar convite pelo Resend')
      return 'FAILED'
    }
  }
}
