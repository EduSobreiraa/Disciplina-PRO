import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase administrativa segura'

describe('Platform tenant administration integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let platformToken: string
  let regularToken: string
  let platformAccessId: string
  let activeTenantId: string
  let ceoMembershipId: string
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const users = app.get(CreateUserUseCase)
    const [platform, , ceo] = await Promise.all([
      users.execute({ email: `tenant-admin-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `tenant-regular-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `tenant-ceo-${suffix}@disciplina.test`, password: PASSWORD }),
    ])
    const access = await prisma.platformAccess.create({ data: { userId: platform.id } })
    platformAccessId = access.id
    const activeTenant = await prisma.tenant.create({ data: { name: 'Operacional', slug: `operacional-${suffix}`, status: 'ACTIVE' } })
    activeTenantId = activeTenant.id
    const ceoMembership = await prisma.tenantMembership.create({ data: { tenantId: activeTenant.id, userId: ceo.id, role: 'CEO' } })
    ceoMembershipId = ceoMembership.id
    platformToken = await login(`tenant-admin-${suffix}@disciplina.test`)
    regularToken = await login(`tenant-regular-${suffix}@disciplina.test`)
  })

  afterAll(async () => app.close())

  async function login(email: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email, password: PASSWORD })
      .expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function post(path: string, token: string, body: object) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/platform/tenants${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
  }

  function patch(path: string, body = { reason: 'Decisão administrativa confirmada' }) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/api/platform/tenants/${path}`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send(body)
  }

  it('lists the platform projection without accepting tenant-scoped identities', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/platform/tenants').set('Authorization', `Bearer ${regularToken}`).expect(403)
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/platform/tenants').set('Authorization', `Bearer ${platformToken}`).expect(200)
    const tenants = response.body as Array<{ id: string; activeCeo: { membershipId: string; email: string } | null }>
    expect(tenants.find(({ id }) => id === activeTenantId)?.activeCeo).toEqual({ membershipId: ceoMembershipId, email: `tenant-ceo-${suffix}@disciplina.test` })
  })

  it('creates a pending tenant and audit atomically without allowing a regular user', async () => {
    await post('', regularToken, { name: 'Sem acesso', slug: `sem-acesso-${suffix}`, timeZone: 'America/Bahia' }).expect(403)
    const response = await post('', platformToken, {
      name: '  Empresa   Criada  ',
      slug: `empresa-criada-${suffix}`,
      timeZone: 'America/Bahia',
    }).expect(201)
    expect(response.body).toMatchObject({ name: 'Empresa Criada', slug: `empresa-criada-${suffix}`, status: 'PENDING' })
    const tenantId = (response.body as { id: string }).id
    expect(await prisma.auditEvent.findFirst({ where: { tenantId, action: 'TENANT_CREATED' } })).toMatchObject({
      actorPlatformAccessId: platformAccessId,
      entityId: tenantId,
    })
    await post('', platformToken, { name: 'Duplicada', slug: `empresa-criada-${suffix}`, timeZone: 'America/Bahia' })
      .expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_SLUG_UNAVAILABLE' }))
    await patch(`${tenantId}/close`).expect(200)
    await patch(`${tenantId}/close`).expect(409).expect(({ body }) => expect(body).toMatchObject({ code: 'INVALID_TENANT_TRANSITION' }))
  })

  it('serializes concurrent transitions and writes one suspension event', async () => {
    const results = await Promise.all([
      patch(`${activeTenantId}/suspend`),
      patch(`${activeTenantId}/suspend`),
    ])
    expect(results.map(({ status }) => status).sort()).toEqual([200, 409])
    expect(await prisma.auditEvent.count({ where: { tenantId: activeTenantId, action: 'TENANT_SUSPENDED' } })).toBe(1)
    expect(await prisma.tenant.findUniqueOrThrow({ where: { id: activeTenantId } })).toMatchObject({ status: 'SUSPENDED' })
  })

  it('requires exactly one active CEO to reactivate and applies state immediately', async () => {
    await prisma.tenantMembership.update({ where: { id: ceoMembershipId }, data: { status: 'INACTIVE', deactivatedAt: new Date() } })
    await patch(`${activeTenantId}/reactivate`).expect(409).expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_ACTIVE_CEO_REQUIRED' }))
    await prisma.tenantMembership.update({ where: { id: ceoMembershipId }, data: { status: 'ACTIVE', deactivatedAt: null } })
    const response = await patch(`${activeTenantId}/reactivate`).expect(200)
    expect(response.body).toMatchObject({ status: 'ACTIVE', suspendedAt: null })
    expect(await prisma.auditEvent.count({ where: { tenantId: activeTenantId, action: 'TENANT_REACTIVATED' } })).toBe(1)
  })

  it('returns stable errors for malformed and unknown tenant identifiers', async () => {
    await patch('not-a-uuid/suspend').expect(400).expect(({ body }) => expect(body).toMatchObject({ code: 'INVALID_TENANT_DATA' }))
    await patch('019f854f-1e79-7cb5-ab4e-392158644046/suspend').expect(404).expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_NOT_FOUND' }))
  })
})
