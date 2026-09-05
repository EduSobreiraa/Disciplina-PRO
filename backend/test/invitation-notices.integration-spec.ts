import { type INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { jest } from '@jest/globals'
import { randomUUID } from 'node:crypto'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { InvitationTokenService } from '../src/modules/invitations/application/invitation-token.js'
import { ResendDeliveryRepository } from '../src/modules/invitations/application/resend-delivery.repository.js'
import { InvitationNoticeDelivery, InvitationNoticeRepository } from '../src/modules/invitations/application/invitation-notice.js'
import { ProcessInvitationNoticesUseCase } from '../src/modules/invitations/application/process-invitation-notices.use-case.js'
import { ListInvitationsUseCase } from '../src/modules/invitations/application/invitation-administration.use-cases.js'

describe('Durable administrator delivery notices', () => {
  let app: INestApplication
  let prisma: PrismaService
  let repository: InvitationNoticeRepository
  const send = jest.fn<InvitationNoticeDelivery['send']>().mockResolvedValue('SENT')
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(InvitationNoticeDelivery).useValue({ send }).compile()
    app = module.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    repository = app.get(InvitationNoticeRepository)
  })
  beforeEach(() => {
    send.mockReset().mockResolvedValue('SENT')
    app.get(ConfigService).set('INVITATION_EMAIL_PROVIDER', 'resend')
    app.get(ConfigService).set('SMTP_DELIVERY_ENABLED', true)
  })
  afterAll(async () => app.close())

  async function fixture() {
    const tenant = await prisma.tenant.create({ data: { name: 'Notice lab', slug: `notice-${randomUUID()}`, status: 'ACTIVE' } })
    const owner = await app.get(CreateUserUseCase).execute({ email: `${randomUUID()}@example.test`, password: 'senha ficticia segura para aviso' })
    const creator = await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: owner.id, role: 'CEO' } })
    const token = app.get(InvitationTokenService).generate()
    const email = `${randomUUID()}@example.test`
    const invitation = await prisma.invitation.create({ data: { tenantId: tenant.id, createdByMembershipId: creator.id, email, normalizedEmail: email, role: 'USER', tokenHash: token.hash, expiresAt: new Date(Date.now() + 72 * 60 * 60000) } })
    const tracking = app.get(ResendDeliveryRepository)
    await tracking.recordFailure(invitation.id, token.hash, 'PERMANENT')
    const job = await prisma.invitationEmailRetry.findFirstOrThrow({ where: { invitationId: invitation.id } })
    // Scope candidate enumeration to this fixture, exercising real DB claim/finish.
    const processor = new ProcessInvitationNoticesUseCase({
      reviewInterrupted: (now) => repository.reviewInterrupted(now),
      findPending: () => Promise.resolve([{ id: job.id }]),
      claim: (id, now) => repository.claim(id, now),
      finish: (id, status) => repository.finish(id, status),
    }, { send }, app.get(ConfigService))
    const context = { tenantId: tenant.id, membershipId: creator.id, userId: owner.id, tenantRole: 'CEO' as const }
    return { tenant, owner, creator, token, invitation, job, processor, context, tracking }
  }

  it('sends once across concurrent workers and repeated failure webhooks', async () => {
    const f = await fixture()
    await Promise.all([f.processor.execute(), f.processor.execute()])
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith({ id: f.job.id, invitationId: f.invitation.id, email: f.owner.email })
    const providerEmailId = randomUUID()
    await f.tracking.recordSent(f.invitation.id, providerEmailId)
    const event = { eventId: `msg_${randomUUID()}`, providerEmailId, status: 'BOUNCED' as const, occurredAt: new Date() }
    await f.tracking.recordEvent(event)
    await f.tracking.recordEvent(event)
    await f.processor.execute()
    expect(send).toHaveBeenCalledTimes(1)
    expect(await prisma.invitationEmailRetry.findUnique({ where: { id: f.job.id } })).toMatchObject({ status: 'REVIEW', noticeStatus: 'SENT' })
  })

  it('returns a tenant-scoped panel alert without tokens or internal jobs', async () => {
    const f = await fixture()
    const other = await fixture()
    const records = await app.get(ListInvitationsUseCase).execute(f.context)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ id: f.invitation.id, deliveryReview: { reason: 'PERMANENT', noticeStatus: 'PENDING' } })
    expect(JSON.stringify(records)).not.toContain(f.token.hash)
    expect(JSON.stringify(records)).not.toContain(other.invitation.id)
    expect(JSON.stringify(records)).not.toContain(f.job.id)
  })

  it('does not consume pending notices while sending is disabled', async () => {
    const f = await fixture()
    app.get(ConfigService).set('SMTP_DELIVERY_ENABLED', false)
    await f.processor.execute()
    expect(send).not.toHaveBeenCalled()
    expect(await prisma.invitationEmailRetry.findUnique({ where: { id: f.job.id } })).toMatchObject({ noticeStatus: 'PENDING' })
  })

  it('restricts manager alerts to invitations created by that manager', async () => {
    const f = await fixture()
    const manager = await app.get(CreateUserUseCase).execute({ email: `${randomUUID()}@example.test`, password: 'senha ficticia segura para gestor' })
    const membership = await prisma.tenantMembership.create({ data: { tenantId: f.tenant.id, userId: manager.id, role: 'MANAGER' } })
    const context = { tenantId: f.tenant.id, membershipId: membership.id, userId: manager.id, tenantRole: 'MANAGER' as const }
    expect(await app.get(ListInvitationsUseCase).execute(context)).toEqual([])
    await prisma.invitation.update({ where: { id: f.invitation.id }, data: { createdByMembershipId: membership.id } })
    expect(await app.get(ListInvitationsUseCase).execute(context)).toEqual([expect.objectContaining({ id: f.invitation.id, deliveryReview: { reason: 'PERMANENT', noticeStatus: 'PENDING' } })])
  })

  it('notifies the active platform creator for an initial CEO invitation', async () => {
    const f = await fixture()
    const platform = await prisma.platformAccess.create({ data: { userId: f.owner.id } })
    await prisma.tenant.update({ where: { id: f.tenant.id }, data: { status: 'PENDING' } })
    await prisma.invitation.update({ where: { id: f.invitation.id }, data: { role: 'CEO', createdByMembershipId: null, createdByPlatformAccessId: platform.id } })
    await f.processor.execute()
    expect(send).toHaveBeenCalledWith({ id: f.job.id, invitationId: f.invitation.id, email: f.owner.email })
  })

  it('does not select a CEO from another tenant when the local CEO is inactive', async () => {
    const f = await fixture()
    await fixture()
    await prisma.user.update({ where: { id: f.owner.id }, data: { status: 'DISABLED', disabledAt: new Date() } })
    await f.processor.execute()
    expect(send).not.toHaveBeenCalled()
    expect(await prisma.invitationEmailRetry.findUnique({ where: { id: f.job.id } })).toMatchObject({ noticeStatus: 'BLOCKED' })
  })

  it.each(['FAILED', 'BLOCKED', 'UNCERTAIN'] as const)('keeps %s visible without recursive notifications', async (status) => {
    const f = await fixture()
    send.mockResolvedValue(status)
    await f.processor.execute()
    await f.processor.execute()
    expect(send).toHaveBeenCalledTimes(1)
    expect((await app.get(ListInvitationsUseCase).execute(f.context))[0].deliveryReview).toMatchObject({ noticeStatus: status })
  })

  it('does not replay an interrupted notification', async () => {
    const f = await fixture()
    await repository.claim(f.job.id, new Date(Date.now() - 6 * 60000))
    await f.processor.execute()
    expect(send).not.toHaveBeenCalled()
    expect(await prisma.invitationEmailRetry.findUnique({ where: { id: f.job.id } })).toMatchObject({ noticeStatus: 'UNCERTAIN' })
  })
})
