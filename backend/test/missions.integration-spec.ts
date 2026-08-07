import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { MissionsClock } from '../src/modules/missions/application/missions-clock.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase segura para missions'

interface MissionsBody {
  metrics: { perfectDays: number; perfectStreak: number; monthPercent: number; minimumBehaviorPercent: number; weeklyXp: number; markedDays: number; totalGreens: number; completedRitualSections: number }
}

class FixedMissionsClock extends MissionsClock { now() { return new Date('2026-08-03T12:00:00.000Z') } }

describe('Missions HTTP integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantA: string
  let tenantB: string
  let membershipA: string
  let membershipB: string
  let tokenA: string
  let tokenB: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(MissionsClock).useClass(FixedMissionsClock).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const users = app.get(CreateUserUseCase)
    const [userA, userB] = await Promise.all([
      users.execute({ email: `missions-a-${suffix}@test.invalid`, password: PASSWORD }),
      users.execute({ email: `missions-b-${suffix}@test.invalid`, password: PASSWORD }),
    ])
    const [createdA, createdB] = await Promise.all([
      prisma.tenant.create({ data: { name: 'Missions A', slug: `missions-a-${suffix}`, timeZone: 'America/Bahia', status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'Missions B', slug: `missions-b-${suffix}`, timeZone: 'Pacific/Kiritimati', status: 'ACTIVE' } }),
    ])
    tenantA = createdA.id
    tenantB = createdB.id
    const [memberA, memberB] = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId: tenantA, userId: userA.id } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantB, userId: userB.id } }),
    ])
    membershipA = memberA.id
    membershipB = memberB.id
    ;[tokenA, tokenB] = await Promise.all([login(userA.email), login(userB.email)])
  })

  afterAll(async () => app.close())

  it('derives reproducible tenant-scoped metrics without creating rewards', async () => {
    const [behaviorA, behaviorB] = await Promise.all([
      prisma.trackerBehavior.create({ data: { tenantId: tenantA, membershipId: membershipA, name: 'A', normalizedName: 'a', position: 0 } }),
      prisma.trackerBehavior.create({ data: { tenantId: tenantB, membershipId: membershipB, name: 'B', normalizedName: 'b', position: 0 } }),
    ])
    await prisma.trackerMark.createMany({ data: [
      { tenantId: tenantA, membershipId: membershipA, behaviorId: behaviorA.id, trackedOn: new Date('2026-08-01'), status: 'COMPLETED' },
      { tenantId: tenantA, membershipId: membershipA, behaviorId: behaviorA.id, trackedOn: new Date('2026-08-02'), status: 'COMPLETED' },
      { tenantId: tenantB, membershipId: membershipB, behaviorId: behaviorB.id, trackedOn: new Date('2026-08-01'), status: 'FAILED' },
    ] })
    const day = await prisma.ritualDay.create({ data: { tenantId: tenantA, membershipId: membershipA, ritualDate: new Date('2026-08-01') } })
    await prisma.ritualCheck.createMany({ data: ['review-panel', 'declare-behaviors', 'critical-behavior', 'check-schedule'].map((itemKey) => ({ ritualDayId: day.id, tenantId: tenantA, membershipId: membershipA, sectionKey: 'opening', itemKey })) })

    const rewardsBefore = await prisma.xpTransaction.count({ where: { tenantId: tenantA, membershipId: membershipA } })
    const first = await authorized(tokenA, tenantA).expect(200)
    const second = await authorized(tokenA, tenantA).expect(200)
    expect(first.body).toEqual(second.body)
    expect((first.body as MissionsBody).metrics).toMatchObject({ perfectDays: 2, perfectStreak: 2, monthPercent: 100, minimumBehaviorPercent: 100, markedDays: 2, totalGreens: 2, completedRitualSections: 1 })
    expect(await prisma.xpTransaction.count({ where: { tenantId: tenantA, membershipId: membershipA } })).toBe(rewardsBefore)

    const foreign = await authorized(tokenB, tenantB).expect(200)
    expect((foreign.body as MissionsBody).metrics).toMatchObject({ perfectDays: 0, totalGreens: 0, completedRitualSections: 0 })
    await authorized(tokenA, tenantB).expect(403)
  })

  async function login(email: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/login').set('Origin', ORIGIN).send({ email, password: PASSWORD }).expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function authorized(token: string, tenantId: string) {
    return request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/missions/me').set('Origin', ORIGIN).set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', tenantId)
  }
})
