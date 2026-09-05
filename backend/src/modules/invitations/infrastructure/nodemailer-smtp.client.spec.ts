import { jest } from '@jest/globals'
import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js'
import { Logger } from '@nestjs/common'
import { NodemailerSmtpClient } from './nodemailer-smtp.client.js'
import { SmtpInvitationDelivery } from './smtp-invitation-delivery.js'

const secret = 'fictitious-invitation-token-never-log'
const values: Record<string, unknown> = {
  SMTP_HOST: 'smtp.example.test', SMTP_PORT: 587, SMTP_SECURE: false,
  SMTP_REQUIRE_TLS: true, SMTP_AUTH_USER: 'fictitious-user', SMTP_AUTH_PASSWORD: 'fictitious-password',
  SMTP_DELIVERY_ENABLED: true, SMTP_FROM: 'no-reply@example.test',
  INVITATION_ACCEPTANCE_URL: 'https://app.example.test/convites/aceitar',
}
const config = { get: (key: string) => values[key] }
const invitation = { invitationId: 'invitation-1', email: 'member@example.test', token: secret, expiresAt: new Date('2026-09-08T12:00:00Z') }

function subject() {
  const sendMail = jest.fn<() => Promise<SMTPTransport.SentMessageInfo>>()
  const createTransport = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as never)
  const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
  const client = new NodemailerSmtpClient(config as never)
  return { client, delivery: new SmtpInvitationDelivery(config as never, client), sendMail, createTransport, warn }
}

describe('SMTP transport failure boundary', () => {
  afterEach(() => jest.restoreAllMocks())

  it('preserves authenticated TLS and bounds connection, greeting and inactivity waits', () => {
    const { createTransport } = subject()
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: values.SMTP_HOST, port: 587, secure: false, requireTLS: true,
      auth: { user: values.SMTP_AUTH_USER, pass: values.SMTP_AUTH_PASSWORD },
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 30_000,
    }))
  })

  it('reports SENT only after SMTP accepts a recipient', async () => {
    const { delivery, sendMail, warn } = subject()
    sendMail.mockResolvedValue({ accepted: [invitation.email], rejected: [] } as unknown as SMTPTransport.SentMessageInfo)
    await expect(delivery.send(invitation)).resolves.toBe('SENT')
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(warn).not.toHaveBeenCalled()
  })

  it.each([
    { accepted: [], rejected: [invitation.email] },
    { accepted: [], rejected: [] },
    { accepted: [invitation.email], rejected: ['rejected@example.test'] },
  ])('does not turn an unaccepted/partially rejected envelope into SENT: %j', async (result) => {
    const { delivery, sendMail, warn } = subject()
    sendMail.mockResolvedValue(result as unknown as SMTPTransport.SentMessageInfo)
    await expect(delivery.send(invitation)).resolves.toBe('FAILED')
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith({ invitationId: invitation.invitationId }, 'Falha ao entregar convite por SMTP')
    expect(JSON.stringify(warn.mock.calls)).not.toContain(invitation.email)
    expect(JSON.stringify(warn.mock.calls)).not.toContain(secret)
  })

  it.each(['ETIMEDOUT', 'ECONNECTION', 'EAUTH', 'EENVELOPE'])('contains %s without logging credentials or retrying immediately', async (code) => {
    const { delivery, sendMail, warn } = subject()
    sendMail.mockRejectedValue(Object.assign(new Error(`${secret} ${invitation.email} ${String(values.SMTP_AUTH_PASSWORD)}`), { code }))
    await expect(delivery.send(invitation)).resolves.toBe('FAILED')
    expect(sendMail).toHaveBeenCalledTimes(1)
    const logged = JSON.stringify(warn.mock.calls)
    expect(logged).not.toContain(secret)
    expect(logged).not.toContain(invitation.email)
    expect(logged).not.toContain(values.SMTP_AUTH_PASSWORD)
    expect(logged).not.toContain(code)
  })

  it('allows a later explicit delivery after transport recovery', async () => {
    const { delivery, sendMail } = subject()
    sendMail.mockRejectedValueOnce(new Error('temporary SMTP failure'))
      .mockResolvedValueOnce({ accepted: [invitation.email], rejected: [] } as unknown as SMTPTransport.SentMessageInfo)
    await expect(delivery.send(invitation)).resolves.toBe('FAILED')
    expect(sendMail).toHaveBeenCalledTimes(1)
    await expect(delivery.send({ ...invitation, token: 'fresh-fictitious-token' })).resolves.toBe('SENT')
    expect(sendMail).toHaveBeenCalledTimes(2)
  })
})
