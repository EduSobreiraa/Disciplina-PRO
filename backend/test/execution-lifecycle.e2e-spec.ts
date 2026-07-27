import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { ProcessInternalEventsUseCase } from '../src/modules/events/application/process-internal-events.use-case.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase e2e de execução segura'

describe('Projeto 66 execution E2E journey', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let foreignTenantId: string
  let enrollmentId: string
  let activityId: string
  let accessToken: string
  let foreignToken: string
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)

    const users = app.get(CreateUserUseCase)
    const [owner, foreign] = await Promise.all([
      users.execute({ email: email('owner'), password: PASSWORD }),
      users.execute({ email: email('foreign'), password: PASSWORD }),
    ])
    const [tenant, foreignTenant] = await Promise.all([
      prisma.tenant.create({
        data: { name: 'Projeto 66 E2E', slug: `projeto-66-e2e-${suffix}`, status: 'ACTIVE', timeZone: 'America/Bahia' },
      }),
      prisma.tenant.create({
        data: { name: 'Execução externa', slug: `execution-foreign-${suffix}`, status: 'ACTIVE', timeZone: 'America/Bahia' },
      }),
    ])
    tenantId = tenant.id
    foreignTenantId = foreignTenant.id
    const membership = await prisma.tenantMembership.create({
      data: { tenantId, userId: owner.id, role: 'USER' },
    })
    await prisma.tenantMembership.create({
      data: { tenantId: foreignTenant.id, userId: foreign.id, role: 'USER' },
    })

    const program = await prisma.program.create({
      data: {
        slug: `projeto-66-${suffix}`,
        name: 'Projeto 66',
        summary: 'Ciclo objetivo de 66 dias.',
        status: 'ACTIVE',
      },
    })
    const version = await prisma.programVersion.create({
      data: {
        programId: program.id,
        versionNumber: 1,
        title: 'Projeto 66',
        description: 'Versão E2E.',
        durationDays: 66,
        executionConfiguration: {
          dailyRecord: {
            pillars: [
              { key: 'discipline', label: 'Disciplina', minimum: 0, maximum: 10 },
              { key: 'focus', label: 'Foco', minimum: 0, maximum: 10 },
              { key: 'self-control', label: 'Domínio Próprio', minimum: 0, maximum: 10 },
              { key: 'execution', label: 'Execução', minimum: 0, maximum: 10 },
              { key: 'emotional-control', label: 'Controle Emocional', minimum: 0, maximum: 10 },
              { key: 'vital-energy', label: 'Energia Vital', minimum: 0, maximum: 10 },
            ],
            requireAllPillars: true,
          },
        },
      },
    })
    const phase = await prisma.programPhase.create({
      data: {
        programVersionId: version.id,
        key: 'fundamentos',
        title: 'Fundamentos',
        description: 'Primeira fase.',
        position: 1,
      },
    })
    activityId = (await prisma.programActivity.create({
      data: {
        programVersionId: version.id,
        programPhaseId: phase.id,
        key: 'morning-1',
        title: 'Acordar no primeiro toque',
        description: 'Primeiro item objetivo.',
        position: 1,
        type: 'CHECKLIST',
        frequency: 'DAILY',
        configuration: { privateResponse: { enabled: true, maximumPayloadBytes: 2048 } },
      },
    })).id
    await prisma.programVersion.update({
      where: { id: version.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    })
    const tenantProgram = await prisma.tenantProgram.create({
      data: { tenantId, programId: program.id },
    })
    enrollmentId = (await prisma.enrollment.create({
      data: {
        tenantId,
        tenantProgramId: tenantProgram.id,
        programId: program.id,
        membershipId: membership.id,
      },
    })).id
    ;[accessToken, foreignToken] = await Promise.all([login(email('owner')), login(email('foreign'))])
  })

  afterAll(async () => app.close())

  function email(label: string) {
    return `execution-e2e-${label}-${suffix}@disciplina.test`
  }

  async function login(userEmail: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: userEmail, password: PASSWORD })
      .expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function api(method: 'get' | 'post' | 'put', path: string, token = accessToken, contextTenantId = tenantId) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])[method](`/api/enrollments${path}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', contextTenantId)
  }

  it('starts, records objective/private data, pauses, resumes and completes without leaking private content', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/session')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({
        user: { email: email('owner') },
        organizations: [{
          tenant: { id: tenantId, name: 'Projeto 66 E2E' },
          membership: { role: 'USER' },
        }],
        platformAccess: null,
      }))
    await api('get', '').expect(200)
      .expect(({ body }) => expect(body).toEqual([expect.objectContaining({ id: enrollmentId, status: 'AVAILABLE' })]))
    await api('post', `/${enrollmentId}/start`).expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ id: enrollmentId, status: 'ACTIVE', version: { durationDays: 66 } }))

    const scores = [
      { pillarKey: 'discipline', score: 8 },
      { pillarKey: 'focus', score: 7 },
      { pillarKey: 'self-control', score: 9 },
      { pillarKey: 'execution', score: 8 },
      { pillarKey: 'emotional-control', score: 7 },
      { pillarKey: 'vital-energy', score: 8 },
    ]
    const completions = await Promise.all([
      api('put', `/${enrollmentId}/activities/${activityId}/completion`),
      api('put', `/${enrollmentId}/activities/${activityId}/completion`),
    ])
    expect(completions.map(({ status }) => status)).toEqual([200, 200])
    const records = await Promise.all([
      api('put', `/${enrollmentId}/daily-record`).send({ scores }),
      api('put', `/${enrollmentId}/daily-record`).send({ scores }),
    ])
    expect(records.map(({ status }) => status)).toEqual([200, 200])

    await api('put', `/${enrollmentId}/private-responses/${activityId}`)
      .send({ payload: { gratitude: 'conteúdo íntimo E2E' } })
      .expect(200)
    await api('get', `/${enrollmentId}/private-responses/${activityId}`).expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ payload: { gratitude: 'conteúdo íntimo E2E' } }))

    const detail = await api('get', `/${enrollmentId}`).expect(200)
    expect(detail.body).toMatchObject({
      activities: [{ id: activityId, key: 'morning-1' }],
      activityCompletions: [{ activityId }],
      dailyRecords: [{ pillarScores: expect.arrayContaining(scores) as typeof scores }],
    })
    expect(JSON.stringify(detail.body)).not.toContain('conteúdo íntimo E2E')
    expect(await prisma.activityCompletion.count({ where: { enrollmentId } })).toBe(1)
    expect(await prisma.dailyRecord.count({ where: { enrollmentId } })).toBe(1)

    await api('post', `/${enrollmentId}/pause`).send({ reason: 'Pausa consciente' }).expect(201)
    await api('put', `/${enrollmentId}/activities/${activityId}/completion`).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'EXECUTION_BLOCKED' }))
    await api('post', `/${enrollmentId}/resume`).expect(201)

    const today = new Date()
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { startedOn: new Date(todayUtc.getTime() - 66 * 86_400_000) },
    })
    await api('post', `/${enrollmentId}/complete`).expect(201)
      .expect(({ body }) => expect(body).toMatchObject({
        status: 'COMPLETED',
        calendar: { programDay: 66, isCompletable: true },
      }))

    const processor = app.get(ProcessInternalEventsUseCase)
    await Promise.all([
      processor.execute({ batchSize: 100 }),
      processor.execute({ batchSize: 100 }),
    ])
    const gamification = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/gamification/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Id', tenantId)
      .expect(200)
    const gamificationBody = gamification.body as {
      balance: number
      level: { key: string }
      transactions: Array<{ amount: number }>
      achievements: Array<{ key: string }>
    }
    expect(gamificationBody).toMatchObject({ balance: 560, level: { key: 'soldier' } })
    expect(gamificationBody.transactions.map(({ amount }) => amount)).toEqual(expect.arrayContaining([10, 50, 500]))
    expect(gamificationBody.achievements.map(({ key }) => key)).toEqual(expect.arrayContaining(['first-xp', 'project-day', 'xp-500']))
    expect(JSON.stringify(gamification.body)).not.toContain('conteúdo íntimo E2E')
    expect(await prisma.xpTransaction.count({ where: { tenantId } })).toBe(3)

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/gamification/me')
      .set('Authorization', `Bearer ${foreignToken}`)
      .set('X-Tenant-Id', foreignTenantId)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ balance: 0, transactions: [], achievements: [] }))

    await api('get', `/${enrollmentId}`, foreignToken).expect(403)
    const audits = await prisma.auditEvent.findMany({ where: { tenantId, entityId: { in: [enrollmentId, activityId] } } })
    expect(JSON.stringify(audits)).not.toContain('conteúdo íntimo E2E')
  })
})
