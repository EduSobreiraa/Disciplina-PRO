import { type INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { jest } from '@jest/globals'
import { randomUUID } from 'node:crypto'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { InvitationDelivery } from '../src/modules/invitations/application/invitation-delivery.js'
import { InvitationTokenService } from '../src/modules/invitations/application/invitation-token.js'
import { ResendDeliveryRepository } from '../src/modules/invitations/application/resend-delivery.repository.js'
import { ProcessInvitationRetriesUseCase } from '../src/modules/invitations/application/process-invitation-retries.use-case.js'
import { InvitationRetryRepository } from '../src/modules/invitations/application/invitation-retry.repository.js'
import { AcceptInvitationForNewIdentityUseCase } from '../src/modules/invitations/application/invitation-acceptance.use-cases.js'

describe('Durable invitation retries', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tracking: ResendDeliveryRepository
  let processor: ProcessInvitationRetriesUseCase
  let tenantId: string
  let creatorId: string
  const send = jest.fn<InvitationDelivery['send']>().mockResolvedValue('SENT')
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(InvitationDelivery).useValue({ send }).compile()
    app = module.createNestApplication()
    await app.init()
    app.get(ConfigService).set('INVITATION_EMAIL_PROVIDER', 'resend')
    app.get(ConfigService).set('SMTP_DELIVERY_ENABLED', true)
    prisma = app.get(PrismaService)
    tracking = app.get(ResendDeliveryRepository)
    processor = app.get(ProcessInvitationRetriesUseCase)
    const tenant = await prisma.tenant.create({ data: { name: 'Retry lab', slug: `retry-${randomUUID()}`, status: 'ACTIVE' } })
    tenantId = tenant.id
    const owner = await app.get(CreateUserUseCase).execute({ email: `${randomUUID()}@example.test`, password: 'senha ficticia de retry bastante longa' })
    const creator = await prisma.tenantMembership.create({ data: { tenantId, userId: owner.id, role: 'CEO' } })
    creatorId = creator.id
  })
  beforeEach(() => { send.mockReset().mockResolvedValue('SENT') })
  afterAll(async () => app.close())

  async function scheduled() {
    const token = app.get(InvitationTokenService).generate()
    const email = `${randomUUID()}@example.test`
    const invitation = await prisma.invitation.create({ data: { tenantId, createdByMembershipId: creatorId, email, normalizedEmail: email, role: 'USER', tokenHash: token.hash, expiresAt: new Date(Date.now() + 72 * 60 * 60000) } })
    await tracking.recordFailure(invitation.id, token.hash, 'TEMPORARY')
    const job = await prisma.invitationEmailRetry.findUniqueOrThrow({ where: { invitationId_expectedTokenHash: { invitationId: invitation.id, expectedTokenHash: token.hash } } })
    return { invitation, token, job }
  }

  it('waits 30 minutes, survives a new processor and allows one concurrent claim only', async () => {
    const { invitation, token, job } = await scheduled()
    expect(job.dueAt.getTime() - job.createdAt.getTime()).toBeGreaterThanOrEqual(30 * 60000 - 1000)
    await tracking.recordFailure(invitation.id, token.hash, 'TEMPORARY')
    expect(await prisma.invitationEmailRetry.count({ where: { invitationId: invitation.id } })).toBe(1)
    await processor.execute(new Date(job.dueAt.getTime() - 1))
    expect(send).not.toHaveBeenCalled()
    const restarted = new ProcessInvitationRetriesUseCase(app.get(InvitationRetryRepository), app.get(InvitationTokenService), { send }, app.get(ConfigService))
    await Promise.all([processor.execute(job.dueAt), restarted.execute(job.dueAt)])
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].token).not.toBe(token.plainText)
    const current = await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id } })
    expect(current.tokenHash).toBe(app.get(InvitationTokenService).hash(send.mock.calls[0][0].token))
    expect(current.expiresAt).toEqual(invitation.expiresAt)
    const stored = await prisma.invitationEmailRetry.findUniqueOrThrow({ where: { id: job.id } })
    expect(stored.status).toBe('SENT')
    expect(JSON.stringify(stored)).not.toContain(send.mock.calls[0][0].token)
    await restarted.execute(job.dueAt)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it.each(['accepted', 'revoked', 'expired', 'rotated', 'suppressed'])('cancels a stale retry when %s', async (mode) => {
    const { invitation, token, job } = await scheduled()
    if (mode === 'accepted') await app.get(AcceptInvitationForNewIdentityUseCase).execute({ token: token.plainText, password: 'senha segura de aceite para retry' })
    if (mode === 'revoked') await prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'REVOKED', revokedAt: new Date() } })
    if (mode === 'expired') await prisma.invitation.update({ where: { id: invitation.id }, data: { expiresAt: new Date(Date.now() + 1000) } })
    if (mode === 'rotated') await prisma.invitation.update({ where: { id: invitation.id }, data: { tokenHash: app.get(InvitationTokenService).generate().hash } })
    if (mode === 'suppressed') {
      const providerEmailId = randomUUID()
      await tracking.recordSent(invitation.id, providerEmailId)
      await tracking.recordEvent({ eventId: `msg_${randomUUID()}`, providerEmailId, status: 'BOUNCED', occurredAt: new Date() })
    }
    await processor.execute(job.dueAt)
    expect(send).not.toHaveBeenCalled()
    expect(await prisma.invitationEmailRetry.findUnique({ where: { id: job.id } })).toMatchObject({ status: mode === 'suppressed' ? 'REVIEW' : 'CANCELLED' })
  })

  it('does not schedule a third send when the retry fails', async () => {
    const { job, invitation } = await scheduled()
    send.mockResolvedValue('FAILED')
    await processor.execute(job.dueAt)
    await processor.execute(new Date(job.dueAt.getTime() + 60000))
    expect(send).toHaveBeenCalledTimes(1)
    expect(await prisma.invitationEmailRetry.findUnique({ where: { id: job.id } })).toMatchObject({ status: 'REVIEW', reason: 'EXHAUSTED' })
    expect(await prisma.invitationEmailRetry.count({ where: { invitationId: invitation.id } })).toBe(1)
  })

  it('cancels a queued retry when the same token generation is accepted by Resend', async () => {
    const { invitation, token, job } = await scheduled()
    await tracking.recordSent(invitation.id, randomUUID(), token.hash)
    await processor.execute(job.dueAt)
    expect(send).not.toHaveBeenCalled()
    expect(await prisma.invitationEmailRetry.findUnique({ where: { id: job.id } })).toMatchObject({ status: 'CANCELLED' })
  })

  it('requires review instead of blindly replaying a crashed attempt', async () => {
    const { job } = await scheduled()
    await prisma.invitationEmailRetry.update({ where: { id: job.id }, data: { status: 'CLAIMED', claimedAt: new Date(job.dueAt.getTime() - 6 * 60000) } })
    await processor.execute(job.dueAt)
    expect(send).not.toHaveBeenCalled()
    expect(await prisma.invitationEmailRetry.findUnique({ where: { id: job.id } })).toMatchObject({ status: 'REVIEW', reason: 'INTERRUPTED' })
  })
})
