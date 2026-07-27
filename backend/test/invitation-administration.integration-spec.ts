import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { InvitationDelivery } from '../src/modules/invitations/application/invitation-delivery.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase de convite segura'

describe('Invitation administration integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let pendingTenantId: string
  let otherTeamId: string
  let managedTeamId: string
  let unownedTeamId: string
  let ceoToken: string
  let managerToken: string
  let userToken: string
  let platformToken: string
  let managerMembershipId: string
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(InvitationDelivery)
      .useValue({ send: () => Promise.resolve('FAILED' as const) })
      .compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const users = app.get(CreateUserUseCase)
    const [ceo, manager, user, platform] = await Promise.all([
      users.execute({ email: `invite-ceo-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `invite-manager-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `invite-user-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `invite-platform-${suffix}@disciplina.test`, password: PASSWORD }),
    ])
    const [tenant, pending, other] = await Promise.all([
      prisma.tenant.create({ data: { name: 'Tenant de Convites', slug: `convites-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'Tenant Pendente', slug: `convites-pendente-${suffix}` } }),
      prisma.tenant.create({ data: { name: 'Tenant Externo', slug: `convites-externo-${suffix}`, status: 'ACTIVE' } }),
    ])
    tenantId = tenant.id
    pendingTenantId = pending.id
    const [ceoMembership, managerMembership, userMembership] = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId, userId: ceo.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: manager.id, role: 'MANAGER' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: user.id, role: 'USER' } }),
    ])
    managerMembershipId = managerMembership.id
    const [managedTeam, unownedTeam, otherTeam] = await Promise.all([
      prisma.team.create({ data: { tenantId, name: 'Time Gerenciado', normalizedName: `time gerenciado ${suffix}` } }),
      prisma.team.create({ data: { tenantId, name: 'Time Não Gerenciado', normalizedName: `time não gerenciado ${suffix}` } }),
      prisma.team.create({ data: { tenantId: other.id, name: 'Time Externo', normalizedName: `time externo ${suffix}` } }),
    ])
    managedTeamId = managedTeam.id
    unownedTeamId = unownedTeam.id
    otherTeamId = otherTeam.id
    await Promise.all([
      prisma.teamMembership.create({ data: { tenantId, teamId: managedTeamId, membershipId: managerMembership.id, role: 'MANAGER' } }),
      prisma.platformAccess.create({ data: { userId: platform.id } }),
    ])
    expect(ceoMembership.role).toBe('CEO')
    expect(userMembership.role).toBe('USER')
    ;[ceoToken, managerToken, userToken, platformToken] = await Promise.all([
      login(`invite-ceo-${suffix}@disciplina.test`),
      login(`invite-manager-${suffix}@disciplina.test`),
      login(`invite-user-${suffix}@disciplina.test`),
      login(`invite-platform-${suffix}@disciplina.test`),
    ])
  })

  afterAll(async () => app.close())

  async function login(email: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN).send({ email, password: PASSWORD }).expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function tenantApi(method: 'get' | 'post' | 'patch', path: string, token = ceoToken) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])[method](`/api/invitations${path}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
  }

  it('creates a CEO-scoped invitation without exposing its token and rejects duplicates or memberships', async () => {
    const email = `new-manager-${suffix}@disciplina.test`
    const created = await tenantApi('post', '').send({
      email,
      role: 'MANAGER',
      teams: [{ teamId: managedTeamId, role: 'MANAGER' }],
    }).expect(201)
    expect(created.body).toMatchObject({ email, role: 'MANAGER', status: 'PENDING', deliveryStatus: 'FAILED' })
    expect(JSON.stringify(created.body)).not.toMatch(/token/i)
    const invitationId = (created.body as { id: string }).id
    const stored = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, include: { teams: true } })
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(stored.teams).toEqual([expect.objectContaining({ teamId: managedTeamId, role: 'MANAGER' })])
    expect(await prisma.auditEvent.findFirst({ where: { entityId: invitationId, action: 'INVITATION_CREATED' } })).toBeTruthy()

    await tenantApi('post', '').send({ email: email.toUpperCase(), role: 'USER' }).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVITATION_ALREADY_PENDING' }))
    await tenantApi('post', '').send({ email: `invite-user-${suffix}@disciplina.test`, role: 'USER' }).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'MEMBERSHIP_ALREADY_EXISTS' }))
  })

  it('enforces Manager ownership and managed-team scope', async () => {
    await tenantApi('post', '', userToken).send({ email: `denied-${suffix}@disciplina.test`, role: 'USER' }).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PERMISSION_DENIED' }))
    await tenantApi('post', '', managerToken).send({ email: `no-team-${suffix}@disciplina.test`, role: 'USER' }).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'RESOURCE_SCOPE_DENIED' }))
    await tenantApi('post', '', managerToken).send({
      email: `unowned-${suffix}@disciplina.test`,
      role: 'USER',
      teams: [{ teamId: unownedTeamId, role: 'MEMBER' }],
    }).expect(403)
    await tenantApi('post', '', managerToken).send({
      email: `cross-${suffix}@disciplina.test`,
      role: 'USER',
      teams: [{ teamId: otherTeamId, role: 'MEMBER' }],
    }).expect(404)
    const own = await tenantApi('post', '', managerToken).send({
      email: `managed-${suffix}@disciplina.test`,
      role: 'USER',
      teams: [{ teamId: managedTeamId, role: 'MEMBER' }],
    }).expect(201)
    const ownId = (own.body as { id: string }).id
    const managerListing = await tenantApi('get', '', managerToken).expect(200)
    expect((managerListing.body as Array<{ id: string }>).map(({ id }) => id)).toEqual([ownId])
    expect(await prisma.invitation.findUniqueOrThrow({ where: { id: ownId } })).toMatchObject({ createdByMembershipId: managerMembershipId })
  })

  it('rotates the token on resend and revokes once with stable ownership errors', async () => {
    const created = await tenantApi('post', '').send({ email: `lifecycle-${suffix}@disciplina.test`, role: 'USER' }).expect(201)
    const id = (created.body as { id: string }).id
    const before = await prisma.invitation.findUniqueOrThrow({ where: { id } })
    await tenantApi('patch', `/${id}/resend`).expect(200)
    const after = await prisma.invitation.findUniqueOrThrow({ where: { id } })
    expect(after.tokenHash).not.toBe(before.tokenHash)
    expect(after.expiresAt.getTime()).toBeGreaterThanOrEqual(before.expiresAt.getTime())
    await tenantApi('patch', `/${id}/revoke`).expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ status: 'REVOKED' }))
    await tenantApi('patch', `/${id}/resend`).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVALID_INVITATION_TRANSITION' }))
    await tenantApi('patch', `/${id}/revoke`, managerToken).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'RESOURCE_SCOPE_DENIED' }))
  })

  it('creates only one first-CEO invitation for a pending tenant', async () => {
    const endpoint = `/api/platform/tenants/${pendingTenantId}/invitations/ceo`
    const created = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(endpoint).set('Authorization', `Bearer ${platformToken}`)
      .send({ email: `first-ceo-${suffix}@disciplina.test` }).expect(201)
    expect(created.body).toMatchObject({ tenantId: pendingTenantId, role: 'CEO', deliveryStatus: 'FAILED' })
    expect(JSON.stringify(created.body)).not.toMatch(/token/i)
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(endpoint).set('Authorization', `Bearer ${platformToken}`)
      .send({ email: `second-ceo-${suffix}@disciplina.test` }).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVITATION_ALREADY_PENDING' }))
    expect(await prisma.auditEvent.count({ where: { tenantId: pendingTenantId, action: 'FIRST_CEO_INVITATION_CREATED' } })).toBe(1)
  })
})
