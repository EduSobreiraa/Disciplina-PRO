import { jest } from '@jest/globals'
import { Logger } from '@nestjs/common'
import { ResendInvitationDelivery } from './resend-invitation-delivery.js'

const message = { invitationId: 'invitation-test', email: 'owner@example.test', token: 't'.repeat(43), expiresAt: new Date('2026-09-09T12:00:00Z') }
const values: Record<string, unknown> = {
  SMTP_DELIVERY_ENABLED: true, DEPLOYMENT_STAGE: 'lab', RESEND_TEST_RECIPIENT: message.email,
  RESEND_API_KEY: 're_fake-test-only', RESEND_FROM: 'onboarding@resend.dev',
  INVITATION_ACCEPTANCE_URL: 'https://app.example.test/convites/aceitar',
}
function subject(overrides: Record<string, unknown> = {}) {
  const config = { get: (name: string) => ({ ...values, ...overrides })[name] }
  const request = jest.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ id: 'email-test' }), { status: 200 })))
  const warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
  const tracking = { isSuppressed: jest.fn<() => Promise<boolean>>().mockResolvedValue(false), recordSent: jest.fn<() => Promise<void>>().mockResolvedValue(), recordEvent: jest.fn<() => Promise<void>>().mockResolvedValue(), recordFailure: jest.fn<(id: string, hash: string, reason: string, retryJobId?: string) => Promise<void>>().mockResolvedValue() }
  const tokens = { hash: () => 'h'.repeat(64), generate: () => ({ plainText: message.token, hash: 'h'.repeat(64) }) }
  return { delivery: new ResendInvitationDelivery(config as never, tracking, tokens), request, warning, tracking }
}

describe('Resend invitation delivery', () => {
  afterEach(() => jest.restoreAllMocks())

  it('blocks recipients with a durable permanent rejection without contacting Resend', async () => {
    const { delivery, request, tracking } = subject()
    tracking.isSuppressed.mockResolvedValue(true)
    expect(await delivery.send(message)).toBe('FAILED')
    expect(request).not.toHaveBeenCalled()
  })

  it('does not report success if tracking could not be persisted', async () => {
    const { delivery, tracking } = subject()
    tracking.recordSent.mockRejectedValue(new Error('Database unavailable'))
    expect(await delivery.send(message)).toBe('FAILED')
  })

  it('sends the shared invitation template with the token only in the fragment', async () => {
    const { delivery, request } = subject()
    expect(await delivery.send(message)).toBe('SENT')
    const [url, options] = request.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(options?.signal).toBeInstanceOf(AbortSignal)
    const payload = JSON.parse(options?.body as string) as Record<string, string>
    expect(payload.to).toBe(message.email)
    expect(payload.from).toBe('onboarding@resend.dev')
    expect(payload.html).toContain(`#token=${message.token}`)
    expect(payload.text).not.toContain('?token=')
    expect(JSON.stringify(options?.headers)).not.toContain(message.token)
  })

  it('reuses idempotency for an identical attempt but not for a rotated token', async () => {
    const { delivery, request } = subject()
    await delivery.send(message)
    await delivery.send(message)
    await delivery.send({ ...message, token: 'n'.repeat(43) })
    const keys = request.mock.calls.map(([, options]) => (options?.headers as Record<string, string>)['Idempotency-Key'])
    expect(keys[0]).toBe(keys[1])
    expect(keys[2]).not.toBe(keys[0])
  })

  it.each([400, 401, 403, 409, 429, 500])('fails safely on HTTP %s without automatic retry', async (status) => {
    const { delivery, request, warning } = subject()
    request.mockResolvedValue(new Response(`${message.token} ${message.email} re_fake-test-only`, { status }))
    expect(await delivery.send(message)).toBe('FAILED')
    expect(request).toHaveBeenCalledTimes(1)
    const logged = JSON.stringify(warning.mock.calls)
    for (const secret of [message.token, message.email, values.RESEND_API_KEY]) expect(logged).not.toContain(secret)
  })

  it('handles timeout without leaking the exception', async () => {
    const { delivery, request, warning, tracking } = subject()
    request.mockRejectedValue(new Error(message.token))
    expect(await delivery.send(message)).toBe('FAILED')
    expect(JSON.stringify(warning.mock.calls)).not.toContain(message.token)
    expect(tracking.recordFailure).toHaveBeenCalledWith(message.invitationId, 'h'.repeat(64), 'AMBIGUOUS', undefined)
  })

  it.each([[429, 'rate_limit_exceeded', 'TEMPORARY'], [503, 'service_unavailable', 'TEMPORARY'], [429, 'daily_quota_exceeded', 'PERMANENT'], [409, 'concurrent_idempotent_requests', 'AMBIGUOUS'], [500, 'application_error', 'AMBIGUOUS']])('classifies %s %s as %s', async (status, name, reason) => {
    const { delivery, request, tracking } = subject()
    request.mockResolvedValue(new Response(JSON.stringify({ name }), { status: Number(status) }))
    expect(await delivery.send(message)).toBe('FAILED')
    expect(tracking.recordFailure).toHaveBeenCalledWith(message.invitationId, 'h'.repeat(64), reason, undefined)
  })

  it.each(['{}', '{"id":null}', 'invalid-json'])('does not report acceptance for malformed response %s', async (body) => {
    const { delivery, request } = subject()
    request.mockResolvedValue(new Response(body, { status: 200 }))
    expect(await delivery.send(message)).toBe('FAILED')
  })

  it.each([{ SMTP_DELIVERY_ENABLED: false }, { RESEND_TEST_RECIPIENT: undefined }, { RESEND_TEST_RECIPIENT: 'someone-else@example.test' }])('does not send outside explicit lab scope: %j', async (overrides) => {
    const { delivery, request } = subject(overrides)
    expect(await delivery.send(message)).toBe('FAILED')
    expect(request).not.toHaveBeenCalled()
  })

  it('allows the real recipient in staging without the lab restriction', async () => {
    const { delivery, request } = subject({ DEPLOYMENT_STAGE: 'staging', RESEND_FROM: 'no-reply@example.test', RESEND_TEST_RECIPIENT: undefined })
    expect(await delivery.send(message)).toBe('SENT')
    expect(request).toHaveBeenCalledTimes(1)
  })
})
