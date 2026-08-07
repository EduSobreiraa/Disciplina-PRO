import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase organizacional segura'

describe('Team administration integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let ceoToken: string
  let managerToken: string
  let tenantId: string
  let otherTenantId: string
  let ceoMembershipId: string
  let memberMembershipId: string
  let otherTeamId: string
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const users = app.get(CreateUserUseCase)
    const [ceo, manager, member] = await Promise.all([
      users.execute({ email: `team-ceo-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `team-manager-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `team-member-${suffix}@disciplina.test`, password: PASSWORD }),
    ])
    const [tenant, otherTenant] = await Promise.all([
      prisma.tenant.create({ data: { name: 'Tenant de Times', slug: `times-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'Outro Tenant', slug: `outro-times-${suffix}`, status: 'ACTIVE' } }),
    ])
    tenantId = tenant.id
    otherTenantId = otherTenant.id
    const [ceoMembership, managerMembership, memberMembership] = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId, userId: ceo.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: manager.id, role: 'MANAGER' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: member.id, role: 'USER' } }),
    ])
    ceoMembershipId = ceoMembership.id
    memberMembershipId = memberMembership.id
    otherTeamId = (await prisma.team.create({ data: { tenantId: otherTenantId, name: 'Time externo', normalizedName: 'time externo' } })).id
    ceoToken = await login(`team-ceo-${suffix}@disciplina.test`)
    managerToken = await login(`team-manager-${suffix}@disciplina.test`)
    expect(managerMembership.role).toBe('MANAGER')
  })

  afterAll(async () => app.close())

  async function login(email: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN).send({ email, password: PASSWORD }).expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function api(method: 'get' | 'post' | 'patch', path: string, token = ceoToken, selectedTenantId = tenantId) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])[method](`/api/teams${path}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', selectedTenantId)
  }

  it('allows only CEO capability and hides a team from another tenant', async () => {
    await api('post', '', managerToken).send({ name: 'Sem permissão' }).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PERMISSION_DENIED' }))
    await api('patch', `/${otherTeamId}`).send({ name: 'Tentativa cruzada' }).expect(404)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'RESOURCE_NOT_FOUND' }))
  })

  it('creates and lists normalized teams with atomic audit', async () => {
    const response = await api('post', '').send({ name: '  Operações   São Paulo  ' }).expect(201)
    expect(response.body).toMatchObject({ tenantId, name: 'Operações São Paulo', normalizedName: 'operações são paulo', archivedAt: null })
    const teamId = (response.body as { id: string }).id
    expect(await prisma.auditEvent.findFirst({ where: { tenantId, entityId: teamId, action: 'TEAM_CREATED' } })).toMatchObject({ actorMembershipId: ceoMembershipId })
    await api('post', '').send({ name: 'operações são paulo' }).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'TEAM_NAME_UNAVAILABLE' }))
    const listing = await api('get', '').expect(200)
    expect((listing.body as Array<{ id: string }>).map(({ id }) => id)).toContain(teamId)
  })

  it('serializes concurrent creation of the same normalized name', async () => {
    const results = await Promise.all([
      api('post', '').send({ name: 'Comercial Concorrente' }),
      api('post', '').send({ name: '  comercial   concorrente ' }),
    ])
    expect(results.map(({ status }) => status).sort()).toEqual([201, 409])
    expect(await prisma.team.count({ where: { tenantId, normalizedName: 'comercial concorrente', archivedAt: null } })).toBe(1)
  })

  it('updates, archives with active links, and restores only when the name is available', async () => {
    const created = await api('post', '').send({ name: 'Suporte' }).expect(201)
    const teamId = (created.body as { id: string }).id
    await api('patch', `/${teamId}`).send({ name: '  Sucesso   do Cliente ' }).expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ name: 'Sucesso do Cliente', normalizedName: 'sucesso do cliente' }))
    const link = await prisma.teamMembership.create({ data: { tenantId, teamId, membershipId: memberMembershipId } })
    await api('patch', `/${teamId}/archive`).expect(200)
      .expect(({ body }) => expect((body as { archivedAt: string }).archivedAt).toBeTruthy())
    expect(await prisma.teamMembership.findUniqueOrThrow({ where: { id: link.id } })).toMatchObject({ endedAt: expect.any(Date) as Date })
    expect(await prisma.auditEvent.findFirst({ where: { entityId: link.id, action: 'TEAM_MEMBERSHIP_ENDED' } })).toMatchObject({ actorMembershipId: ceoMembershipId, targetMembershipId: memberMembershipId })
    const listing = await api('get', '').expect(200)
    expect((listing.body as Array<{ id: string; archivedAt: string | null }>).find(({ id }) => id === teamId)?.archivedAt).toBeTruthy()

    const replacement = await api('post', '').send({ name: 'Sucesso do Cliente' }).expect(201)
    await api('patch', `/${teamId}/restore`).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'TEAM_NAME_UNAVAILABLE' }))
    const replacementId = (replacement.body as { id: string }).id
    await api('patch', `/${replacementId}/archive`).expect(200)
    await api('patch', `/${teamId}/restore`).expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ archivedAt: null }))
    expect(await prisma.teamMembership.findUniqueOrThrow({ where: { id: link.id } })).toMatchObject({ endedAt: expect.any(Date) as Date })
  })

  it('returns stable errors for malformed and invalid transitions', async () => {
    await api('patch', '/not-a-uuid/archive').expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVALID_TEAM_DATA' }))
    const created = await api('post', '').send({ name: 'Time terminal de teste' }).expect(201)
    const teamId = (created.body as { id: string }).id
    await api('patch', `/${teamId}/restore`).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVALID_TEAM_TRANSITION' }))
  })
})
