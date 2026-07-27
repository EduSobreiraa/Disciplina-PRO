import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { InvitationDelivery, type InvitationDeliveryMessage } from '../src/modules/invitations/application/invitation-delivery.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase e2e de programa segura'

describe('Program catalog and availability E2E matrix', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantA: string
  let tenantB: string
  let platformToken: string
  let ceoAToken: string
  let managerAToken: string
  let userAToken: string
  let ceoBToken: string
  let programId: string
  let versionId: string
  let tenantProgramId: string
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
    const labels = ['platform', 'ceo-a', 'manager-a', 'user-a', 'ceo-b']
    const created = await Promise.all(labels.map((label) => users.execute({ email: email(label), password: PASSWORD })))
    const [platform, ceoA, managerA, userA, ceoB] = created
    if (!platform || !ceoA || !managerA || !userA || !ceoB) throw new Error('Fixture E2E de programas incompleta')

    const tenants = await Promise.all([
      prisma.tenant.create({ data: { name: 'Programa E2E A', slug: `program-e2e-a-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'Programa E2E B', slug: `program-e2e-b-${suffix}`, status: 'ACTIVE' } }),
    ])
    tenantA = tenants[0].id
    tenantB = tenants[1].id
    const memberships = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId: tenantA, userId: ceoA.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantA, userId: managerA.id, role: 'MANAGER' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantA, userId: userA.id, role: 'USER' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantB, userId: ceoB.id, role: 'CEO' } }),
    ])
    expect(memberships[0].role).toBe('CEO')
    await prisma.platformAccess.create({ data: { userId: platform.id } })
    ;[platformToken, ceoAToken, managerAToken, userAToken, ceoBToken] = await Promise.all(
      labels.map((label) => login(email(label))),
    )
  })

  afterAll(async () => app.close())

  function email(label: string) {
    return `program-e2e-${label}-${suffix}@disciplina.test`
  }

  async function login(userEmail: string, password = PASSWORD) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN).send({ email: userEmail, password }).expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function platform(method: 'post' | 'put', path: string, token = platformToken) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])[method](`/api/platform${path}`)
      .set('Authorization', `Bearer ${token}`)
  }

  function catalog(path: string, token: string, tenantId = tenantA) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/programs${path}`).set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', tenantId)
  }

  function definition() {
    return {
      title: 'Jornada de Disciplina',
      description: 'Definição global executável e independente de produto.',
      durationDays: 30,
      phases: [{
        key: 'fundamentos',
        title: 'Fundamentos',
        description: 'Fase inicial.',
        position: 1,
        activities: [{
          key: 'acao-diaria',
          title: 'Ação diária',
          description: 'Atividade genérica do catálogo.',
          position: 1,
          type: 'TASK',
          frequency: 'DAILY',
          configuration: { estimatedMinutes: 10 },
        }],
      }],
    }
  }

  it('restricts authorship to the platform, publishes once, and makes the tree immutable', async () => {
    const payload = {
      slug: `jornada-${suffix}`,
      name: 'Jornada Global',
      summary: 'Programa global sem regras específicas de execução.',
      version: definition(),
    }
    await platform('post', '/programs', ceoAToken).send(payload).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PLATFORM_ACCESS_DENIED' }))

    const created = await platform('post', '/programs').send(payload).expect(201)
    programId = (created.body as { programId: string }).programId
    versionId = (created.body as { id: string }).id
    const publications = await Promise.all([
      platform('post', `/program-versions/${versionId}/publish`),
      platform('post', `/program-versions/${versionId}/publish`),
    ])
    expect(publications.map(({ status }) => status).sort()).toEqual([201, 409])
    expect(await prisma.programVersion.count({ where: { programId, status: 'PUBLISHED' } })).toBe(1)
    await expect(prisma.programVersion.update({
      where: { id: versionId },
      data: { title: 'Mutação indevida' },
    })).rejects.toThrow()
    expect(await prisma.programVersion.findUniqueOrThrow({ where: { id: versionId } })).toMatchObject({
      title: definition().title,
      status: 'PUBLISHED',
    })
  })

  it('enables idempotently for every role while keeping the other tenant isolated', async () => {
    const enabled = await Promise.all([
      platform('put', `/tenants/${tenantA}/programs/${programId}/enable`),
      platform('put', `/tenants/${tenantA}/programs/${programId}/enable`),
    ])
    expect(enabled.map(({ status }) => status)).toEqual([200, 200])
    const relation = await prisma.tenantProgram.findUniqueOrThrow({ where: { tenantId_programId: { tenantId: tenantA, programId } } })
    tenantProgramId = relation.id
    expect(await prisma.enrollment.count({ where: { tenantProgramId } })).toBe(3)

    for (const token of [ceoAToken, managerAToken, userAToken]) {
      const listing = await catalog('', token).expect(200)
      const items = listing.body as Array<{ id: string; enrollment: { status: string; cycleNumber: number } | null }>
      expect(items).toHaveLength(1)
      expect(items[0]?.id).toBe(programId)
      expect(items[0]?.enrollment).toEqual({ id: expect.any(String) as string, status: 'AVAILABLE', cycleNumber: 1 })
      await catalog(`/${programId}`, token).expect(200)
        .expect(({ body }) => expect(body).toMatchObject({
          id: programId,
          version: {
            id: versionId,
            phases: [{ key: 'fundamentos', activities: [{ key: 'acao-diaria', type: 'TASK', frequency: 'DAILY' }] }],
          },
        }))
    }
    await catalog('', ceoBToken, tenantB).expect(200).expect([])
    await catalog(`/${programId}`, ceoBToken, tenantB).expect(404)
    await catalog('', platformToken, tenantA).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_ACCESS_DENIED' }))
  })

  it('provisions a later invited member exactly once and exposes the same generic catalog', async () => {
    const recipient = email('late-user')
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/invitations').set('Authorization', `Bearer ${ceoAToken}`).set('X-Tenant-Id', tenantA)
      .send({ email: recipient, role: 'USER' }).expect(201)
    const delivered = deliveries.findLast(({ email: deliveredTo }) => deliveredTo === recipient)
    if (!delivered) throw new Error('Convite E2E não entregue')
    const responses = await Promise.all([
      request(app.getHttpServer() as Parameters<typeof request>[0])
        .post('/api/invitations/accept/new-identity').send({ token: delivered.token, password: PASSWORD }),
      request(app.getHttpServer() as Parameters<typeof request>[0])
        .post('/api/invitations/accept/new-identity').send({ token: delivered.token, password: PASSWORD }),
    ])
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 400])
    const accepted = responses.find(({ status }) => status === 201)
    const membershipId = (accepted?.body as { membershipId: string }).membershipId
    expect(await prisma.enrollment.count({ where: { tenantProgramId, membershipId } })).toBe(1)

    const lateToken = await login(recipient)
    await catalog(`/${programId}`, lateToken).expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ enrollment: { status: 'AVAILABLE' } })
        expect(JSON.stringify(body)).not.toMatch(/projeto.?66/i)
      })
  })

  it('removes disabled programs from every tenant view without deleting offers or history', async () => {
    const before = await prisma.enrollment.count({ where: { tenantProgramId } })
    const disabled = await Promise.all([
      platform('put', `/tenants/${tenantA}/programs/${programId}/disable`),
      platform('put', `/tenants/${tenantA}/programs/${programId}/disable`),
    ])
    expect(disabled.map(({ status }) => status)).toEqual([200, 200])
    expect(await prisma.enrollment.count({ where: { tenantProgramId } })).toBe(before)
    for (const token of [ceoAToken, managerAToken, userAToken]) {
      await catalog('', token).expect(200).expect([])
      await catalog(`/${programId}`, token).expect(404)
    }
    expect(await prisma.auditEvent.count({ where: { entityId: tenantProgramId, action: 'TENANT_PROGRAM_ENABLED' } })).toBe(1)
    expect(await prisma.auditEvent.count({ where: { entityId: tenantProgramId, action: 'TENANT_PROGRAM_DISABLED' } })).toBe(1)
  })
})
