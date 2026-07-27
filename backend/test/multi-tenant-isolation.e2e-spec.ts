import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase e2e multi tenant segura'
const REASON = { reason: 'Validação E2E administrativa' }

interface LoginSession {
  token: string
  cookies: string[]
}

function cookieValue(cookies: string[], name: string) {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`))
  if (!cookie) throw new Error(`Cookie ${name} não encontrado`)
  return cookie.split(';', 1)[0]
}

describe('Multi-tenant isolation E2E matrix', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantA: string
  let tenantB: string
  let teamAOne: string
  let teamATwo: string
  let teamB: string
  let managerAMembership: string
  let userAOneMembership: string
  let userATwoMembership: string
  let userBMembership: string
  let ceoA: LoginSession
  let managerA: LoginSession
  let userAOne: LoginSession
  let userATwo: LoginSession
  let managerB: LoginSession
  let platform: LoginSession
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const users = app.get(CreateUserUseCase)
    const labels = ['ceo-a', 'manager-a', 'user-a1', 'user-a2', 'ceo-b', 'manager-b', 'user-b', 'platform']
    const emails = labels.map((label) => `e2e-${label}-${suffix}@disciplina.test`)
    const created = await Promise.all(emails.map((email) => users.execute({ email, password: PASSWORD })))
    const [ceoAUser, managerAUser, userAOneUser, userATwoUser, ceoBUser, managerBUser, userBUser, platformUser] = created
    if (!ceoAUser || !managerAUser || !userAOneUser || !userATwoUser || !ceoBUser || !managerBUser || !userBUser || !platformUser) throw new Error('Fixture E2E incompleta')
    const [firstTenant, secondTenant] = await Promise.all([
      prisma.tenant.create({ data: { name: 'E2E Tenant A', slug: `e2e-a-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'E2E Tenant B', slug: `e2e-b-${suffix}`, status: 'ACTIVE' } }),
    ])
    tenantA = firstTenant.id
    tenantB = secondTenant.id
    const memberships = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId: tenantA, userId: ceoAUser.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantA, userId: managerAUser.id, role: 'MANAGER' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantA, userId: userAOneUser.id, role: 'USER' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantA, userId: userATwoUser.id, role: 'USER' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantB, userId: ceoBUser.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantB, userId: managerBUser.id, role: 'MANAGER' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantB, userId: userBUser.id, role: 'USER' } }),
    ])
    managerAMembership = memberships[1].id
    userAOneMembership = memberships[2].id
    userATwoMembership = memberships[3].id
    userBMembership = memberships[6].id
    const teams = await Promise.all([
      prisma.team.create({ data: { tenantId: tenantA, name: 'Time A Um', normalizedName: 'time a um' } }),
      prisma.team.create({ data: { tenantId: tenantA, name: 'Time A Dois', normalizedName: 'time a dois' } }),
      prisma.team.create({ data: { tenantId: tenantB, name: 'Time B', normalizedName: 'time b' } }),
    ])
    ;[teamAOne, teamATwo, teamB] = teams.map(({ id }) => id)
    await Promise.all([
      prisma.teamMembership.create({ data: { tenantId: tenantA, teamId: teamAOne, membershipId: managerAMembership, role: 'MANAGER' } }),
      prisma.teamMembership.create({ data: { tenantId: tenantA, teamId: teamAOne, membershipId: userAOneMembership, role: 'MEMBER' } }),
      prisma.teamMembership.create({ data: { tenantId: tenantA, teamId: teamATwo, membershipId: userATwoMembership, role: 'MEMBER' } }),
      prisma.teamMembership.create({ data: { tenantId: tenantB, teamId: teamB, membershipId: memberships[5].id, role: 'MANAGER' } }),
      prisma.teamMembership.create({ data: { tenantId: tenantB, teamId: teamB, membershipId: userBMembership, role: 'MEMBER' } }),
    ])
    await prisma.platformAccess.create({ data: { userId: platformUser.id } })
    ;[ceoA, managerA, userAOne, userATwo, managerB, platform] = await Promise.all([
      login(emails[0]), login(emails[1]), login(emails[2]), login(emails[3]), login(emails[5]), login(emails[7]),
    ])
  })

  afterAll(async () => app.close())

  async function login(email: string): Promise<LoginSession> {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN).send({ email, password: PASSWORD }).expect(200)
    return {
      token: (response.body as { accessToken: string }).accessToken,
      cookies: response.headers['set-cookie'] as unknown as string[],
    }
  }

  function api(method: 'get' | 'post' | 'patch', path: string, session: LoginSession, selectedTenant = tenantA) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])[method](`/api${path}`)
      .set('Authorization', `Bearer ${session.token}`).set('X-Tenant-Id', selectedTenant)
  }

  it('rejects missing authentication, malformed selection, absent membership, and platform bypass', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/teams').set('X-Tenant-Id', tenantA).expect(401)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' }))
    await api('get', '/teams', ceoA, 'not-a-uuid').expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVALID_TENANT_HEADER' }))
    await api('get', '/teams', managerB, tenantA).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_ACCESS_DENIED' }))
    await api('get', '/teams', platform, tenantA).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_ACCESS_DENIED' }))
  })

  it('keeps Manager inside the administered team and tenant', async () => {
    const listing = await api('get', '/memberships', managerA).expect(200)
    const visible = (listing.body as Array<{ id: string }>).map(({ id }) => id)
    expect(visible).toEqual(expect.arrayContaining([managerAMembership, userAOneMembership]))
    expect(visible).not.toContain(userATwoMembership)
    expect(visible).not.toContain(userBMembership)
    await api('patch', `/memberships/${userATwoMembership}/inactivate`, managerA).send(REASON).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'RESOURCE_SCOPE_DENIED' }))
    await api('patch', `/memberships/${userBMembership}/inactivate`, managerA).send(REASON).expect(404)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'RESOURCE_NOT_FOUND' }))
    await api('post', '/teams', managerA).send({ name: 'Time indevido' }).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PERMISSION_DENIED' }))
  })

  it('keeps CEO inside the selected tenant and hides foreign resources', async () => {
    const listing = await api('get', '/memberships', ceoA).expect(200)
    const visible = (listing.body as Array<{ id: string }>).map(({ id }) => id)
    expect(visible).toEqual(expect.arrayContaining([managerAMembership, userAOneMembership, userATwoMembership]))
    expect(visible).not.toContain(userBMembership)
    await api('patch', `/teams/${teamB}`, ceoA).send({ name: 'Tentativa estrangeira' }).expect(404)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'RESOURCE_NOT_FOUND' }))
    await api('patch', `/memberships/${userBMembership}/suspend`, ceoA).send(REASON).expect(404)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'RESOURCE_NOT_FOUND' }))
  })

  it('applies membership and role changes to an existing token immediately', async () => {
    await api('get', '/teams', userAOne).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PERMISSION_DENIED' }))
    await api('patch', `/memberships/${userAOneMembership}/suspend`, ceoA).send(REASON).expect(200)
    await api('get', '/teams', userAOne).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_ACCESS_DENIED' }))
    await api('patch', `/memberships/${userAOneMembership}/reactivate`, ceoA).send(REASON).expect(200)
    await api('get', '/teams', userAOne).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PERMISSION_DENIED' }))

    await api('get', '/memberships', managerA).expect(200)
    await api('patch', `/memberships/${managerAMembership}/role`, ceoA).send({ role: 'USER' }).expect(200)
    await api('get', '/memberships', managerA).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PERMISSION_DENIED' }))
  })

  it('blocks and restores all tenant contexts immediately without granting platform access', async () => {
    await api('get', '/teams', ceoA).expect(200)
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/api/platform/tenants/${tenantA}/suspend`).set('Authorization', `Bearer ${platform.token}`).send(REASON).expect(200)
    await api('get', '/teams', ceoA).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_ACCESS_DENIED' }))
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/api/platform/tenants/${tenantA}/reactivate`).set('Authorization', `Bearer ${platform.token}`).send(REASON).expect(200)
    await api('get', '/teams', ceoA).expect(200)
  })

  it('revokes the current session and rejects its already issued access token', async () => {
    await api('get', '/teams', userATwo).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PERMISSION_DENIED' }))
    const refresh = cookieValue(userATwo.cookies, 'dp_refresh')
    const csrf = cookieValue(userATwo.cookies, 'dp_csrf')
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', [refresh, csrf])
      .set('X-CSRF-Token', decodeURIComponent(csrf.slice('dp_csrf='.length))).expect(204)
    await api('get', '/teams', userATwo).expect(401)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' }))
  })

  it('publishes tenant and platform boundaries in OpenAPI', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder()
      .setTitle('Disciplina PRO API').addBearerAuth({ type: 'http', scheme: 'bearer' }, 'access-token').build())
    const teamsPath = document.paths['/api/teams'] ?? document.paths['/teams']
    const membershipsPath = document.paths['/api/memberships'] ?? document.paths['/memberships']
    const platformPath = document.paths['/api/platform/tenants/{tenantId}/ceo'] ?? document.paths['/platform/tenants/{tenantId}/ceo']
    expect(teamsPath?.get?.security).toEqual(expect.arrayContaining([{ 'access-token': [] }]))
    expect(teamsPath?.get?.parameters).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'X-Tenant-Id', in: 'header', required: true })]))
    expect(membershipsPath?.get).toBeDefined()
    expect(platformPath?.patch?.security).toEqual(expect.arrayContaining([{ 'access-token': [] }]))
  })
})
