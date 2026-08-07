import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { TrackerRepository } from '../src/modules/tracker/application/tracker.repository.js'
import type { CurrentTenantContext } from '../src/modules/organizations/application/organization-context.repository.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase segura para tracker'

interface TrackerBehaviorBody { id: string; name: string; position: number; active: boolean }
interface TrackerStateBody {
  behaviors: TrackerBehaviorBody[]
  marks: Array<{ behaviorId: string; trackedOn: string; status: string; justification: string | null }>
}

describe('Personal tracker HTTP integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantA: string
  let tenantB: string
  let membershipB: string
  let tokenA: string
  let contextA: CurrentTenantContext
  let trackerRepository: TrackerRepository

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    trackerRepository = app.get(TrackerRepository)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const users = app.get(CreateUserUseCase)
    const [userA, userB] = await Promise.all([
      users.execute({ email: `tracker-http-a-${suffix}@test.invalid`, password: PASSWORD }),
      users.execute({ email: `tracker-http-b-${suffix}@test.invalid`, password: PASSWORD }),
    ])
    const [createdTenantA, createdTenantB] = await Promise.all([
      prisma.tenant.create({ data: { name: 'Tracker HTTP A', slug: `tracker-http-a-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'Tracker HTTP B', slug: `tracker-http-b-${suffix}`, status: 'ACTIVE' } }),
    ])
    tenantA = createdTenantA.id
    tenantB = createdTenantB.id
    const [createdMembershipA, createdMembershipB] = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId: tenantA, userId: userA.id } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantB, userId: userB.id } }),
    ])
    membershipB = createdMembershipB.id
    contextA = { tenantId: tenantA, membershipId: createdMembershipA.id, userId: userA.id, tenantRole: createdMembershipA.role }
    const login = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: userA.email, password: PASSWORD })
      .expect(200)
    tokenA = (login.body as { accessToken: string }).accessToken
  })

  afterAll(async () => app.close())

  it('persists the owner state, protects private justification and rejects foreign behavior', async () => {
    const initial = await authorized('get', '/api/tracker/me?from=2026-08-01&to=2026-08-31').expect(200)
    expect((initial.body as TrackerStateBody).behaviors).toHaveLength(10)
    await authorized('post', '/api/tracker/behaviors').send({ name: '   ' }).expect(400)

    const created = await authorized('post', '/api/tracker/behaviors')
      .send({ name: '  Leitura   diária  ' })
      .expect(201)
    const createdBody = created.body as TrackerBehaviorBody
    expect(createdBody).toMatchObject({ name: 'Leitura diária', position: 10, active: true })
    const behaviorId = createdBody.id
    const date = '2026-08-03'

    await authorized('put', `/api/tracker/behaviors/${behaviorId}/marks/${date}`)
      .send({ status: 'FAILED' })
      .expect(204)
    await authorized('put', `/api/tracker/behaviors/${behaviorId}/marks/${date}/justification`)
      .send({ text: '  Interrupção registrada apenas pelo titular.  ' })
      .expect(204)

    const state = await authorized('get', `/api/tracker/me?from=${date}&to=${date}`).expect(200)
    const stateBody = state.body as TrackerStateBody
    expect(stateBody.behaviors).toContainEqual(expect.objectContaining({ id: behaviorId, name: 'Leitura diária' }))
    expect(stateBody.marks).toContainEqual(expect.objectContaining({
      behaviorId,
      trackedOn: '2026-08-03T00:00:00.000Z',
      status: 'FAILED',
      justification: 'Interrupção registrada apenas pelo titular.',
    }))

    await authorized('put', `/api/tracker/behaviors/${behaviorId}/marks/${date}`)
      .send({ status: 'COMPLETED' })
      .expect(204)
    const completed = await authorized('get', `/api/tracker/me?from=${date}&to=${date}`).expect(200)
    expect((completed.body as TrackerStateBody).marks[0]).toMatchObject({ status: 'COMPLETED', justification: null })

    const foreignBehavior = await prisma.trackerBehavior.create({
      data: { tenantId: tenantB, membershipId: membershipB, name: 'Estrangeiro', normalizedName: 'estrangeiro', position: 0 },
    })
    await authorized('put', `/api/tracker/behaviors/${foreignBehavior.id}/marks/${date}`)
      .send({ status: 'FAILED' })
      .expect(404)
    await authorized('get', '/api/tracker/me?from=2026-02-30&to=2026-03-01').expect(400)
    await authorized('put', `/api/tracker/behaviors/${behaviorId}/marks/2099-01-01`)
      .send({ status: 'COMPLETED' })
      .expect(400)
  })

  it('exports and restores the complete state using new internal identifiers', async () => {
    const exported = await authorized('get', '/api/tracker/backup').expect(200)
    expect(exported.body).toMatchObject({ type: 'disciplina-pro-tracker', version: 2 })
    expect((exported.body as { exportedAt: string }).exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const replacement = {
      type: 'disciplina-pro-tracker',
      version: 2,
      data: {
        behaviors: [{ key: 'portable-reading', name: 'Leitura restaurada', position: 0, active: true }],
        marks: [{ behaviorKey: 'portable-reading', trackedOn: '2026-08-02', status: 'FAILED', justification: 'Round-trip privado' }],
      },
    }
    await authorized('put', '/api/tracker/backup').send(replacement).expect(204)
    const restored = await authorized('get', '/api/tracker/me?from=2026-08-02&to=2026-08-02').expect(200)
    const restoredBody = restored.body as TrackerStateBody
    expect(restoredBody.behaviors).toHaveLength(1)
    expect(restoredBody.behaviors[0]).toMatchObject({ name: 'Leitura restaurada', position: 0, active: true })
    expect(restoredBody.behaviors[0].id).not.toBe('portable-reading')
    expect(restoredBody.marks).toEqual([expect.objectContaining({
      behaviorId: restoredBody.behaviors[0].id,
      trackedOn: '2026-08-02T00:00:00.000Z',
      status: 'FAILED',
      justification: 'Round-trip privado',
    })])

    await authorized('put', '/api/tracker/backup').send({
      ...replacement,
      data: { ...replacement.data, marks: [{ ...replacement.data.marks[0], trackedOn: '2099-01-01' }] },
    }).expect(400)
    const unchanged = await authorized('get', '/api/tracker/me?from=2026-08-02&to=2026-08-02').expect(200)
    expect((unchanged.body as TrackerStateBody).marks).toHaveLength(1)
  })

  it('rolls back destructive replacement when persistence rejects the candidate', async () => {
    const before = await trackerRepository.exportBackup(contextA)
    await expect(trackerRepository.restoreBackup(contextA, {
      behaviors: [
        { key: 'first', name: 'Primeiro', position: 0, active: true },
        { key: 'second', name: 'Segundo', position: 0, active: true },
      ],
      marks: [],
    })).rejects.toThrow()
    expect(await trackerRepository.exportBackup(contextA)).toEqual(before)
  })

  function authorized(method: 'get' | 'post' | 'put', path: string) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])[method](path)
      .set('Origin', ORIGIN)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantA)
  }
})
