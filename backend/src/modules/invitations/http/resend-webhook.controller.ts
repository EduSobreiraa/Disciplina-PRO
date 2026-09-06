import { BadRequestException, Controller, HttpCode, Post, Req, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import { Webhook } from 'svix'
import type { Environment } from '../../../config/environment.js'
import { Public } from '../../identity-access/http/public.decorator.js'
import { ResendDeliveryRepository, type ResendDeliveryStatus } from '../application/resend-delivery.repository.js'

const statuses: Record<string, ResendDeliveryStatus> = {
  'email.sent': 'SENT', 'email.delivery_delayed': 'DELAYED', 'email.delivered': 'DELIVERED',
  'email.bounced': 'BOUNCED', 'email.complained': 'COMPLAINED', 'email.failed': 'FAILED', 'email.suppressed': 'SUPPRESSED',
}

@Controller('webhooks/resend')
export class ResendWebhookController {
  constructor(private readonly config: ConfigService<Environment, true>, private readonly deliveries: ResendDeliveryRepository) {}

  @Public()
  @Post()
  @HttpCode(200)
  async receive(@Req() request: Request) {
    const secret = this.config.get('RESEND_WEBHOOK_SECRET', { infer: true })
    if (!secret) throw new ServiceUnavailableException({ code: 'RESEND_WEBHOOK_DISABLED', message: 'Webhook indisponível' })
    const eventId = request.get('svix-id') ?? ''
    let payload: unknown
    try {
      if (!Buffer.isBuffer(request.body) || !/^[A-Za-z0-9_-]{1,160}$/.test(eventId)) throw new Error('INVALID_BODY')
      new Webhook(secret).verify(request.body, {
        'svix-id': eventId,
        'svix-timestamp': request.get('svix-timestamp') ?? '',
        'svix-signature': request.get('svix-signature') ?? '',
      })
      payload = JSON.parse(request.body.toString('utf8')) as unknown
    } catch {
      throw new BadRequestException({ code: 'RESEND_WEBHOOK_INVALID', message: 'Webhook inválido' })
    }
    if (!payload || typeof payload !== 'object' || !('type' in payload) || typeof payload.type !== 'string') throw new BadRequestException('Evento inválido')
    const status = Object.hasOwn(statuses, payload.type) ? statuses[payload.type] : undefined
    if (!status) return { received: true }
    const event = payload as { data?: { email_id?: unknown }; created_at?: unknown }
    const emailId = event.data?.email_id
    const occurredAt = typeof event.created_at === 'string' ? new Date(event.created_at) : new Date(Number.NaN)
    if (typeof emailId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(emailId) || Number.isNaN(occurredAt.getTime())) throw new BadRequestException('Evento inválido')
    // Acknowledge only after commit; storage failures remain retryable by Resend.
    await this.deliveries.recordEvent({ eventId, providerEmailId: emailId, status, occurredAt })
    return { received: true }
  }
}
