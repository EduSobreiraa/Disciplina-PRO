import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer, { type Transporter } from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js'
import type { Environment } from '../../../config/environment.js'
import { SmtpClient, type SmtpMessage } from '../application/smtp-client.js'

@Injectable()
export class NodemailerSmtpClient extends SmtpClient {
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>

  constructor(config: ConfigService<Environment, true>) {
    super()
    const options: SMTPTransport.Options = {
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      requireTLS: config.get('SMTP_REQUIRE_TLS', { infer: true }),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      auth: config.get('SMTP_AUTH_USER', { infer: true }) && config.get('SMTP_AUTH_PASSWORD', { infer: true })
        ? {
            user: config.get('SMTP_AUTH_USER', { infer: true }),
            pass: config.get('SMTP_AUTH_PASSWORD', { infer: true }),
          }
        : undefined,
    }
    this.transporter = nodemailer.createTransport(options)
  }

  async send(message: SmtpMessage) {
    const result = await this.transporter.sendMail(message)
    // SMTP acceptance is not proof of inbox delivery. Never report success
    // when the transport accepted nobody or rejected any recipient.
    if (!result.accepted?.length || result.rejected?.length) {
      throw new Error('SMTP_RECIPIENT_NOT_ACCEPTED')
    }
  }
}
