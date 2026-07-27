import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { InvitationTokenService } from '../src/modules/invitations/application/invitation-token.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase de aceitação segura'
const NEW_PASSWORD = 'outra frase de aceitação segura'

describe('Invitation acceptance integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tokens: InvitationTokenService
  let tenantId: string
  let pendingTenantId: string
  let creatorMembershipId: string
  let teamId: string
  let existingUserId: string
  let existingToken: string
  let otherToken: string
  let platformAccessId: string
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    tokens = app.get(InvitationTokenService)
    const users = app.get(CreateUserUseCase)
    const [creator, existing, , platform] = await Promise.all([
      users.execute({ email: `accept-creator-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `accept-existing-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `accept-other-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `accept-platform-${suffix}@disciplina.test`, password: PASSWORD }),
    ])
    existingUserId = existing.id
    const [tenant, pending] = await Promise.all([
      prisma.tenant.create({ data: { name: 'Aceitação Ativa', slug: `accept-active-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'Aceitação Pendente', slug: `accept-pending-${suffix}` } }),
    ])
    tenantId = tenant.id
    pendingTenantId = pending.id
    const [creatorMembership, team, platformAccess] = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId, userId: creator.id, role: 'CEO' } }),
      prisma.team.create({ data: { tenantId, name: 'Time do Convite', normalizedName: `time convite ${suffix}` } }),
      prisma.platformAccess.create({ data: { userId: platform.id } }),
    ])
    creatorMembershipId = creatorMembership.id
    teamId = team.id
    platformAccessId = platformAccess.id
    ;[existingToken, otherToken] = await Promise.all([
      login(`accept-existing-${suffix}@disciplina.test`),
      login(`accept-other-${suffix}@disciplina.test`),
    ])
  })

  afterAll(async () => app.close())

  async function login(email: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN).send({ email, password: PASSWORD }).expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  async function invitation(input: {
    email: string
    role?: 'USER' | 'MANAGER'
    teams?: Array<{ teamId: string; role: 'MEMBER' | 'MANAGER' }>
    expiresAt?: Date
    status?: 'PENDING' | 'REVOKED'
  }) {
    const token = tokens.generate()
    const now = new Date()
    const created = await prisma.invitation.create({
      data: {
        tenantId,
        email: input.email,
        normalizedEmail: input.email.toLowerCase(),
        role: input.role ?? 'USER',
        tokenHash: token.hash,
        status: input.status ?? 'PENDING',
        expiresAt: input.expiresAt ?? new Date(now.getTime() + 72 * 60 * 60 * 1000),
        revokedAt: input.status === 'REVOKED' ? now : null,
        createdAt: new Date(now.getTime() - (input.expiresAt ? 4 * 24 * 60 * 60 * 1000 : 0)),
        createdByMembershipId: creatorMembershipId,
        teams: input.teams?.length ? {
          create: input.teams.map((team) => ({
            role: team.role,
            team: { connect: { id_tenantId: { id: team.teamId, tenantId } } },
          })),
        } : undefined,
      },
    })
    return { id: created.id, token: token.plainText }
  }

  function acceptNew(token: string, password = NEW_PASSWORD) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/invitations/accept/new-identity').send({ token, password })
  }

  function acceptExisting(token: string, accessToken: string) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/invitations/accept/existing-identity')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token })
  }

  it('accepts a new identity once and creates membership and teams atomically under concurrency', async () => {
    const email = `accepted-new-${suffix}@disciplina.test`
    const created = await invitation({ email, role: 'MANAGER', teams: [{ teamId, role: 'MANAGER' }] })
    const responses = await Promise.all([acceptNew(created.token), acceptNew(created.token)])
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 400])
    expect(responses.find(({ status }) => status === 400)?.body).toMatchObject({ code: 'INVITATION_INVALID' })

    const user = await prisma.user.findUniqueOrThrow({ where: { normalizedEmail: email } })
    expect(user.passwordHash).toMatch(/^\$argon2id\$/)
    const membership = await prisma.tenantMembership.findUniqueOrThrow({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      include: { teams: true },
    })
    expect(membership).toMatchObject({ role: 'MANAGER', status: 'ACTIVE' })
    expect(membership.teams).toEqual([expect.objectContaining({ teamId, role: 'MANAGER', endedAt: null })])
    expect(await prisma.invitation.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({ status: 'ACCEPTED', acceptedAt: expect.any(Date) as Date })
    expect(await prisma.auditEvent.count({ where: { entityId: created.id, action: 'INVITATION_ACCEPTED' } })).toBe(1)
  })

  it('requires authentication for an existing account and never replaces its password', async () => {
    const email = `accept-existing-${suffix}@disciplina.test`
    const before = await prisma.user.findUniqueOrThrow({ where: { id: existingUserId } })
    const created = await invitation({ email })
    await acceptNew(created.token).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED' }))
    expect((await prisma.user.findUniqueOrThrow({ where: { id: existingUserId } })).passwordHash).toBe(before.passwordHash)

    await acceptExisting(created.token, otherToken).expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVITATION_INVALID' }))
    await acceptExisting(created.token, existingToken).expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ userId: existingUserId, identityCreated: false, role: 'USER' }))
    expect((await prisma.user.findUniqueOrThrow({ where: { id: existingUserId } })).passwordHash).toBe(before.passwordHash)
  })

  it('returns the same public error for expired, revoked, consumed, and unknown tokens', async () => {
    const expired = await invitation({
      email: `expired-${suffix}@disciplina.test`,
      expiresAt: new Date(Date.now() - 1000),
    })
    const revoked = await invitation({ email: `revoked-${suffix}@disciplina.test`, status: 'REVOKED' })
    const unknown = tokens.generate()
    for (const token of [expired.token, revoked.token, unknown.plainText]) {
      await acceptNew(token).expect(400)
        .expect(({ body }) => expect(body).toMatchObject({ code: 'INVITATION_INVALID', message: 'Convite inválido' }))
    }
  })

  it('activates a pending tenant atomically when its first CEO accepts', async () => {
    const token = tokens.generate()
    const email = `first-ceo-accepted-${suffix}@disciplina.test`
    const invitationRecord = await prisma.invitation.create({
      data: {
        tenantId: pendingTenantId,
        email,
        normalizedEmail: email,
        role: 'CEO',
        tokenHash: token.hash,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdByPlatformAccessId: platformAccessId,
      },
    })
    const response = await acceptNew(token.plainText).expect(201)
    expect(response.body).toMatchObject({ invitationId: invitationRecord.id, tenantId: pendingTenantId, role: 'CEO', identityCreated: true })
    expect(await prisma.tenant.findUniqueOrThrow({ where: { id: pendingTenantId } })).toMatchObject({ status: 'ACTIVE' })
    expect(await prisma.tenantMembership.count({ where: { tenantId: pendingTenantId, role: 'CEO', status: 'ACTIVE' } })).toBe(1)
    expect(await prisma.auditEvent.count({ where: { entityId: invitationRecord.id, action: 'FIRST_CEO_ACCEPTED' } })).toBe(1)
  })
})
