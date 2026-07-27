import { ConfigService } from '@nestjs/config'
import type { Environment } from '../src/config/environment.js'
import { NodemailerSmtpClient } from '../src/modules/invitations/infrastructure/nodemailer-smtp.client.js'
import { SmtpInvitationDelivery } from '../src/modules/invitations/infrastructure/smtp-invitation-delivery.js'

interface MailpitSummary {
  messages: Array<{ ID: string; To: Array<{ Address: string }> }>
}

interface MailpitMessage {
  Text: string
  HTML: string
}

describe('Mailpit invitation delivery', () => {
  it('delivers a usable fragment link through the real local SMTP service', async () => {
    const recipient = `mailpit-${Date.now()}@disciplina.test`
    const token = 'm'.repeat(43)
    const config = new ConfigService<Environment, true>({
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      SMTP_FROM: 'Disciplina PRO <no-reply@disciplina.local>',
      INVITATION_ACCEPTANCE_URL: 'http://localhost:5173/convites/aceitar',
    } as Environment)
    const delivery = new SmtpInvitationDelivery(config, new NodemailerSmtpClient(config))

    await expect(delivery.send({
      invitationId: '019f854f-1e79-7cb5-ab4e-392158644048',
      email: recipient,
      token,
      expiresAt: new Date('2026-07-28T12:00:00.000Z'),
    })).resolves.toBe('SENT')

    const summary = await fetch('http://127.0.0.1:8025/api/v1/messages').then((response) => response.json() as Promise<MailpitSummary>)
    const delivered = summary.messages.find(({ To }) => To.some(({ Address }) => Address === recipient))
    expect(delivered).toBeDefined()
    const message = await fetch(`http://127.0.0.1:8025/api/v1/message/${delivered?.ID}`).then((response) => response.json() as Promise<MailpitMessage>)
    expect(message.Text).toContain(`/convites/aceitar#token=${token}`)
    expect(message.HTML).toContain(`/convites/aceitar#token=${token}`)
    expect(message.Text).not.toContain(`?token=${token}`)
  })
})
