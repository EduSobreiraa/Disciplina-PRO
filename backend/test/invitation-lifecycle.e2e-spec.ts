import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import {
  InvitationDelivery,
  type InvitationDeliveryMessage,
} from '../src/modules/invitations/application/invitation-delivery.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase e2e de convite segura'
const NEW_PASSWORD = 'outra frase e2e de convite segura'

describe('Invitation lifecycle E2E matrix', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let pendingTenantId: string
  let managedTeamId: string
  let unownedTeamId: string
  let foreignTeamId: string
  let ceoToken: string
  let managerToken: string
  let existingToken: string
  let otherToken: string
  let platformToken: string
  let existingUserId: string
  const deliveries: InvitationDeliveryMessage[] = []
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  beforeAll(async () => {
    const delivery: Pick<InvitationDelivery, 'send'> = {
      send: (message) => {
        deliveries.push(message)
        return Promise.resolve('SENT')
      },
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(InvitationDelivery)
      .useValue(delivery)
      .compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const users = app.get(CreateUserUseCase)
    const [ceo, manager, existing, , platform] = await Promise.all([
      users.execute({ email: email('ceo'), password: PASSWORD }),
      users.execute({ email: email('manager'), password: PASSWORD }),
      users.execute({ email: email('existing'), password: PASSWORD }),
      users.execute({ email: email('other'), password: PASSWORD }),
      users.execute({ email: email('platform'), password: PASSWORD }),
    ])
    existingUserId = existing.id
    const [tenant, pendingTenant, foreignTenant] = await Promise.all([
      prisma.tenant.create({ data: { name: 'E2E Convites', slug: `e2e-invites-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'E2E Primeiro CEO', slug: `e2e-first-ceo-${suffix}` } }),
      prisma.tenant.create({ data: { name: 'E2E Convites Externo', slug: `e2e-invites-foreign-${suffix}`, status: 'ACTIVE' } }),
    ])
    tenantId = tenant.id
    pendingTenantId = pendingTenant.id
    const [ceoMembership, managerMembership] = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId, userId: ceo.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: manager.id, role: 'MANAGER' } }),
      prisma.platformAccess.create({ data: { userId: platform.id } }),
    ])
    const [managedTeam, unownedTeam, foreignTeam] = await Promise.all([
      prisma.team.create({ data: { tenantId, name: 'Time E2E Gerenciado', normalizedName: `time e2e gerenciado ${suffix}` } }),
      prisma.team.create({ data: { tenantId, name: 'Time E2E Não Gerenciado', normalizedName: `time e2e não gerenciado ${suffix}` } }),
      prisma.team.create({ data: { tenantId: foreignTenant.id, name: 'Time E2E Externo', normalizedName: `time e2e externo ${suffix}` } }),
    ])
    managedTeamId = managedTeam.id
    unownedTeamId = unownedTeam.id
    foreignTeamId = foreignTeam.id
    await prisma.teamMembership.create({
      data: { tenantId, teamId: managedTeamId, membershipId: managerMembership.id, role: 'MANAGER' },
    })
    expect(ceoMembership.role).toBe('CEO')
    ;[ceoToken, managerToken, existingToken, otherToken, platformToken] = await Promise.all([
      login(email('ceo')),
      login(email('manager')),
      login(email('existing')),
      login(email('other')),
      login(email('platform')),
    ])
  })

  afterAll(async () => app.close())

  function email(label: string) {
    return `e2e-invitation-${label}-${suffix}@disciplina.test`
  }

  async function login(userEmail: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN).send({ email: userEmail, password: PASSWORD }).expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function tenantApi(method: 'get' | 'post' | 'patch', path: string, accessToken = ceoToken) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])[method](`/api/invitations${path}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Id', tenantId)
  }

  function latestToken(recipient: string) {
    const delivery = deliveries.findLast(({ email: deliveredTo }) => deliveredTo === recipient)
    if (!delivery) throw new Error(`Entrega não encontrada para ${recipient}`)
    return delivery.token
  }

  function acceptNew(token: string) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/invitations/accept/new-identity').send({ token, password: NEW_PASSWORD })
  }

  function acceptExisting(token: string, accessToken: string) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/invitations/accept/existing-identity')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token })
  }

  it('creates and accepts the first CEO once, activating the pending tenant', async () => {
    const recipient = email('first-ceo')
    const endpoint = `/api/platform/tenants/${pendingTenantId}/invitations/ceo`
    const created = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(endpoint).set('Authorization', `Bearer ${platformToken}`).send({ email: recipient }).expect(201)
    expect(created.body).toMatchObject({
      tenantId: pendingTenantId,
      email: recipient,
      role: 'CEO',
      deliveryStatus: 'SENT',
    })
    expect(JSON.stringify(created.body)).not.toMatch(/token/i)

    const token = latestToken(recipient)
    await acceptNew(token).expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ tenantId: pendingTenantId, role: 'CEO', identityCreated: true }))
    await acceptNew(token).expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVITATION_INVALID' }))
    expect(await prisma.tenant.findUniqueOrThrow({ where: { id: pendingTenantId } })).toMatchObject({ status: 'ACTIVE' })
    expect(await prisma.tenantMembership.count({
      where: { tenantId: pendingTenantId, role: 'CEO', status: 'ACTIVE' },
    })).toBe(1)
  })

  it('accepts a new Manager atomically under concurrent requests and assigns its team', async () => {
    const recipient = email('new-manager')
    const created = await tenantApi('post', '').send({
      email: recipient,
      role: 'MANAGER',
      teams: [{ teamId: managedTeamId, role: 'MANAGER' }],
    }).expect(201)
    const invitationId = (created.body as { id: string }).id
    const token = latestToken(recipient)
    const responses = await Promise.all([acceptNew(token), acceptNew(token)])
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 400])
    expect(responses.find(({ status }) => status === 400)?.body).toMatchObject({ code: 'INVITATION_INVALID' })

    const user = await prisma.user.findUniqueOrThrow({ where: { normalizedEmail: recipient } })
    const membership = await prisma.tenantMembership.findUniqueOrThrow({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      include: { teams: true },
    })
    expect(membership).toMatchObject({ role: 'MANAGER', status: 'ACTIVE' })
    expect(membership.teams).toEqual([
      expect.objectContaining({ teamId: managedTeamId, role: 'MANAGER', endedAt: null }),
    ])
    expect(await prisma.auditEvent.count({
      where: { entityId: invitationId, action: 'INVITATION_ACCEPTED' },
    })).toBe(1)
  })

  it('preserves an existing identity and requires the matching authenticated account', async () => {
    const recipient = email('existing')
    const before = await prisma.user.findUniqueOrThrow({ where: { id: existingUserId } })
    await tenantApi('post', '').send({ email: recipient, role: 'USER' }).expect(201)
    const token = latestToken(recipient)

    await acceptNew(token).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED' }))
    await acceptExisting(token, otherToken).expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVITATION_INVALID' }))
    await acceptExisting(token, existingToken).expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ userId: existingUserId, identityCreated: false }))
    expect((await prisma.user.findUniqueOrThrow({ where: { id: existingUserId } })).passwordHash).toBe(before.passwordHash)
  })

  it('keeps a Manager inside its teams and invalidates rotated, revoked, and expired tokens', async () => {
    await tenantApi('post', '', managerToken).send({
      email: email('manager-role-denied'),
      role: 'MANAGER',
      teams: [{ teamId: managedTeamId, role: 'MEMBER' }],
    }).expect(403)
    await tenantApi('post', '', managerToken).send({
      email: email('unowned'),
      role: 'USER',
      teams: [{ teamId: unownedTeamId, role: 'MEMBER' }],
    }).expect(403)
    await tenantApi('post', '', managerToken).send({
      email: email('foreign'),
      role: 'USER',
      teams: [{ teamId: foreignTeamId, role: 'MEMBER' }],
    }).expect(404)

    const recipient = email('managed-user')
    const created = await tenantApi('post', '', managerToken).send({
      email: recipient,
      role: 'USER',
      teams: [{ teamId: managedTeamId, role: 'MEMBER' }],
    }).expect(201)
    const invitationId = (created.body as { id: string }).id
    const originalToken = latestToken(recipient)
    await tenantApi('patch', `/${invitationId}/resend`, managerToken).expect(200)
    const rotatedToken = latestToken(recipient)
    expect(rotatedToken).not.toBe(originalToken)
    await acceptNew(originalToken).expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVITATION_INVALID' }))
    await tenantApi('patch', `/${invitationId}/revoke`, managerToken).expect(200)
    await acceptNew(rotatedToken).expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVITATION_INVALID' }))

    const expiredRecipient = email('expired')
    const expired = await tenantApi('post', '').send({ email: expiredRecipient, role: 'USER' }).expect(201)
    const expiredId = (expired.body as { id: string }).id
    const now = Date.now()
    await prisma.invitation.update({
      where: { id: expiredId },
      data: {
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
        expiresAt: new Date(now - 60 * 60 * 1000),
      },
    })
    await acceptNew(latestToken(expiredRecipient)).expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVITATION_INVALID', message: 'Convite inválido' }))

    const listing = await tenantApi('get', '', managerToken).expect(200)
    expect((listing.body as Array<{ id: string }>).map(({ id }) => id)).toContain(invitationId)
    expect((listing.body as Array<{ email: string }>).map(({ email: listedEmail }) => listedEmail))
      .not.toContain(expiredRecipient)
  })
})
