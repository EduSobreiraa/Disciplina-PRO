import { type INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { randomBytes, randomUUID } from 'node:crypto'
import request from 'supertest'
import { Webhook } from 'svix'
import { jest } from '@jest/globals'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { ResendDeliveryRepository } from '../src/modules/invitations/application/resend-delivery.repository.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'

const SECRET = `whsec_${Buffer.alloc(32, 's').toString('base64')}`

describe('Resend signed webhook and durable delivery tracking', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tracking: ResendDeliveryRepository
  let invitationId: string
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = module.createNestApplication({ bodyParser: false })
    app.get(ConfigService).set('RESEND_WEBHOOK_SECRET', SECRET)
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    tracking = app.get(ResendDeliveryRepository)
    const tenant = await prisma.tenant.create({ data: { name: 'Webhook lab', slug: `webhook-${randomUUID()}`, status: 'ACTIVE' } })
    const owner = await app.get(CreateUserUseCase).execute({ email: `${randomUUID()}@example.test`, password: 'senha ficticia de webhook com entropia' })
    const creator = await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: owner.id, role: 'CEO' } })
    const recipient = `${randomUUID()}@example.test`
    const invitation = await prisma.invitation.create({ data: { tenantId: tenant.id, createdByMembershipId: creator.id, email: recipient, normalizedEmail: recipient, role: 'USER', tokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 86400000) } })
    invitationId = invitation.id
  })
  afterAll(async () => app.close())

  function post(body: string, id = `msg_${randomUUID()}`, timestamp = new Date(), signature?: string) {
    return request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/webhooks/resend')
      .set('Content-Type', 'application/json').set('svix-id', id)
      .set('svix-timestamp', String(Math.floor(timestamp.getTime() / 1000)))
      .set('svix-signature', signature ?? new Webhook(SECRET).sign(id, timestamp, body)).send(body)
  }
  function payload(emailId: string, type = 'email.delivered') {
    return JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: emailId, to: ['private@example.test'], subject: 'secret-not-persisted' } })
  }

  it('rejects forged, modified and expired signatures without storing events', async () => {
    const emailId = randomUUID()
    const body = payload(emailId)
    await post(body, undefined, undefined, 'v1,invalid').expect(400)
    await post(body, undefined, new Date(Date.now() - 10 * 60000)).expect(400)
    const id = `msg_${randomUUID()}`
    const timestamp = new Date()
    await post(`${body} `, id, timestamp, new Webhook(SECRET).sign(id, timestamp, body)).expect(400)
    expect(await prisma.resendEmailEvent.count({ where: { providerEmailId: emailId } })).toBe(0)
  })

  it('commits and deduplicates events arriving before the send response', async () => {
    const emailId = randomUUID()
    const eventId = `msg_${randomUUID()}`
    const body = payload(emailId)
    const responses = await Promise.all([post(body, eventId), post(body, eventId)])
    for (const response of responses) expect({ status: response.status, body: response.body as unknown }).toMatchObject({ status: 200, body: { received: true } })
    expect(await prisma.resendEmailEvent.count({ where: { eventId } })).toBe(1)
    await tracking.recordSent(invitationId, emailId)
    await tracking.recordSent(invitationId, emailId)
    expect(await prisma.resendInvitationMessage.findUnique({ where: { providerEmailId: emailId } })).toMatchObject({ invitationId, status: 'DELIVERED' })
    expect(JSON.stringify(await prisma.resendEmailEvent.findUnique({ where: { eventId } }))).not.toMatch(/private@example|secret-not-persisted/)
  })

  it('does not regress delivered state on delayed or sent events', async () => {
    const emailId = randomUUID()
    await tracking.recordSent(invitationId, emailId)
    await post(payload(emailId)).expect(200)
    await post(payload(emailId, 'email.delivery_delayed')).expect(200)
    await post(payload(emailId, 'email.sent')).expect(200)
    expect(await prisma.resendInvitationMessage.findUnique({ where: { providerEmailId: emailId } })).toMatchObject({ status: 'DELIVERED' })
  })

  it('keeps permanent rejection sticky and blocks further sends', async () => {
    const emailId = randomUUID()
    expect(await tracking.isSuppressed(invitationId)).toBe(false)
    await post(payload(emailId, 'email.bounced')).expect(200)
    await tracking.recordSent(invitationId, emailId)
    await post(payload(emailId)).expect(200)
    expect(await tracking.isSuppressed(invitationId)).toBe(true)
    expect(await prisma.resendInvitationMessage.findUnique({ where: { providerEmailId: emailId } })).toMatchObject({ status: 'BOUNCED' })
    await post(payload(emailId, 'email.complained')).expect(200)
    expect(await prisma.resendInvitationMessage.findUnique({ where: { providerEmailId: emailId } })).toMatchObject({ status: 'COMPLAINED' })
  })

  it('ignores signed unsupported events and rejects malformed supported events', async () => {
    const unsupported = await post(JSON.stringify({ type: 'email.opened' }))
    const malformed = await post(JSON.stringify({ type: 'email.delivered', data: {}, created_at: 'invalid' }))
    expect(unsupported.status).toBe(200)
    expect(malformed.status).toBe(400)
  })

  it('does not acknowledge storage failure and allows a later retry', async () => {
    const emailId = randomUUID()
    const eventId = `msg_${randomUUID()}`
    const body = payload(emailId)
    const failure = jest.spyOn(tracking, 'recordEvent').mockRejectedValueOnce(new Error('storage-unavailable'))
    try {
      const response = await post(body, eventId).expect(500)
      expect(JSON.stringify(response.body)).not.toContain('storage-unavailable')
      expect(await prisma.resendEmailEvent.count({ where: { eventId } })).toBe(0)
    } finally { failure.mockRestore() }
    await post(body, eventId).expect(200)
    expect(await prisma.resendEmailEvent.count({ where: { eventId } })).toBe(1)
  })

  it('limits payload size and remains disabled without its signing secret', async () => {
    const oversized = await post(JSON.stringify({ type: 'email.opened', unused: 'x'.repeat(110000) }))
    expect(oversized.status).toBe(413)
    app.get(ConfigService).set('RESEND_WEBHOOK_SECRET', '')
    try {
      const disabled = await post(payload(randomUUID()))
      expect(disabled.status).toBe(503)
    }
    finally { app.get(ConfigService).set('RESEND_WEBHOOK_SECRET', SECRET) }
  })
})
