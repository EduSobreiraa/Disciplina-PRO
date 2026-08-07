import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { RitualClock } from '../src/modules/ritual/application/ritual-clock.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase segura para ritual'

interface RitualDayBody {
  date: string
  checks: Array<{ sectionKey: string; itemKey: string; completedAt: string }>
  timer: { completedCycles: number; remainingSeconds: number; runningStartedAt: string | null; runningUntil: string | null }
}

class MutableRitualClock extends RitualClock {
  value = new Date('2026-08-03T12:00:00.000Z')
  now() { return new Date(this.value) }
}

describe('Daily ritual HTTP integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let clock: MutableRitualClock
  let tenantA: string
  let tenantB: string
  let tokenA: string
  let tokenB: string

  beforeAll(async () => {
    clock = new MutableRitualClock()
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RitualClock)
      .useValue(clock)
      .compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const users = app.get(CreateUserUseCase)
    const [userA, userB] = await Promise.all([
      users.execute({ email: `ritual-http-a-${suffix}@test.invalid`, password: PASSWORD }),
      users.execute({ email: `ritual-http-b-${suffix}@test.invalid`, password: PASSWORD }),
    ])
    const [createdTenantA, createdTenantB] = await Promise.all([
      prisma.tenant.create({ data: { name: 'Ritual HTTP A', slug: `ritual-http-a-${suffix}`, timeZone: 'Pacific/Kiritimati', status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'Ritual HTTP B', slug: `ritual-http-b-${suffix}`, status: 'ACTIVE' } }),
    ])
    tenantA = createdTenantA.id
    tenantB = createdTenantB.id
    await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId: tenantA, userId: userA.id } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantB, userId: userB.id } }),
    ])
    ;[tokenA, tokenB] = await Promise.all([
      login(userA.email),
      login(userB.email),
    ])
  })

  afterAll(async () => app.close())

  it('persists checks idempotently and respects the tenant civil date', async () => {
    const date = '2026-08-04'
    const initial = await authorized(tokenA, tenantA, 'get', `/api/ritual/me?from=${date}&to=${date}`).expect(200)
    expect(initial.body).toEqual({ days: [] })

    await authorized(tokenA, tenantA, 'put', `/api/ritual/me/${date}/checks/unknown/item`)
      .send({ completed: true })
      .expect(400)
    const first = await authorized(tokenA, tenantA, 'put', `/api/ritual/me/${date}/checks/opening/review-panel`)
      .send({ completed: true })
      .expect(200)
    const firstBody = first.body as RitualDayBody
    expect(firstBody).toMatchObject({ date, checks: [{ sectionKey: 'opening', itemKey: 'review-panel' }] })
    const repeated = await authorized(tokenA, tenantA, 'put', `/api/ritual/me/${date}/checks/opening/review-panel`)
      .send({ completed: true })
      .expect(200)
    expect((repeated.body as RitualDayBody).checks).toEqual(firstBody.checks)
    expect(await prisma.ritualCheck.count({ where: { tenantId: tenantA } })).toBe(1)

    await authorized(tokenA, tenantA, 'put', '/api/ritual/me/2026-08-05/checks/opening/review-panel')
      .send({ completed: true })
      .expect(400)
    await authorized(tokenA, tenantB, 'get', `/api/ritual/me?from=${date}&to=${date}`).expect(403)
    const foreign = await authorized(tokenB, tenantB, 'get', `/api/ritual/me?from=${date}&to=${date}`).expect(200)
    expect(foreign.body).toEqual({ days: [] })
  })

  it('serializes timer commands and settles exactly one elapsed cycle', async () => {
    const date = '2026-08-04'
    const [startedA, startedB] = await Promise.all([
      authorized(tokenA, tenantA, 'post', `/api/ritual/me/${date}/timer/start`).expect(200),
      authorized(tokenA, tenantA, 'post', `/api/ritual/me/${date}/timer/start`).expect(200),
    ])
    expect((startedA.body as RitualDayBody).timer.runningUntil).toBe((startedB.body as RitualDayBody).timer.runningUntil)

    clock.value = new Date('2026-08-03T12:00:10.000Z')
    const paused = await authorized(tokenA, tenantA, 'post', `/api/ritual/me/${date}/timer/pause`).expect(200)
    expect((paused.body as RitualDayBody).timer).toMatchObject({ completedCycles: 0, remainingSeconds: 1790, runningUntil: null })

    await authorized(tokenA, tenantA, 'post', `/api/ritual/me/${date}/timer/start`).expect(200)
    clock.value = new Date('2026-08-03T12:30:01.000Z')
    const settled = await authorized(tokenA, tenantA, 'get', `/api/ritual/me?from=${date}&to=${date}`).expect(200)
    expect((settled.body as { days: RitualDayBody[] }).days[0].timer).toMatchObject({ completedCycles: 1, remainingSeconds: 1800, runningUntil: null })

    const reset = await authorized(tokenA, tenantA, 'post', `/api/ritual/me/${date}/timer/reset`).expect(200)
    expect((reset.body as RitualDayBody).timer).toMatchObject({ completedCycles: 0, remainingSeconds: 1800, runningUntil: null })
    await authorized(tokenA, tenantA, 'post', '/api/ritual/me/2026-08-03/timer/start').expect(409)
  })

  async function login(email: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email, password: PASSWORD })
      .expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function authorized(token: string, tenantId: string, method: 'get' | 'put' | 'post', path: string) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])[method](path)
      .set('Origin', ORIGIN)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
  }
})
