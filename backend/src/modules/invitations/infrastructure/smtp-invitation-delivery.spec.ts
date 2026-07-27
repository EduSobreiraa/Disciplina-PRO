import { jest } from '@jest/globals'
import { SmtpClient } from '../application/smtp-client.js'
import { SmtpInvitationDelivery } from './smtp-invitation-delivery.js'

const message = {
  invitationId: '019f854f-1e79-7cb5-ab4e-392158644048',
  email: 'member@example.test',
  token: 'secret_token-that-must-only-appear-in-the-link',
  expiresAt: new Date('2026-07-26T12:00:00.000Z'),
}

function subject() {
  const smtp = { send: jest.fn<SmtpClient['send']>().mockResolvedValue() }
  const config = {
    get: jest.fn((key: string) => key === 'SMTP_FROM'
      ? 'Disciplina PRO <no-reply@disciplina.local>'
      : 'http://localhost:5173/convites/aceitar'),
  }
  return { delivery: new SmtpInvitationDelivery(config as never, smtp), smtp }
}

describe('SmtpInvitationDelivery', () => {
  it('places the token only in the frontend fragment and sends after being called', async () => {
    const { delivery, smtp } = subject()
    await expect(delivery.send(message)).resolves.toBe('SENT')
    const sent = smtp.send.mock.calls[0][0]
    expect(sent.to).toBe(message.email)
    expect(sent.text).toContain(`/convites/aceitar#token=${message.token}`)
    expect(sent.html).toContain(`/convites/aceitar#token=${message.token}`)
    expect(sent.text).not.toContain(`?token=${message.token}`)
  })

  it('reports failure without leaking the token through an exception', async () => {
    const { delivery, smtp } = subject()
    smtp.send.mockRejectedValueOnce(new Error(`SMTP rejected ${message.token}`))
    await expect(delivery.send(message)).resolves.toBe('FAILED')
  })
})
