import { randomUUID } from 'node:crypto'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'

async function expectPrismaCode(operation: Promise<unknown>, code: string) {
  await expect(operation).rejects.toMatchObject({ code })
}

describe('Daily ritual schema integration', () => {
  it('isolates days and checks and rejects duplicated or inconsistent timer state', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule],
    }).compile()
    await moduleRef.init()
    const prisma = moduleRef.get(PrismaService)
    const suffix = randomUUID()

    try {
      const [tenantA, tenantB] = await Promise.all([
        prisma.tenant.create({ data: { name: 'Ritual A', slug: `ritual-a-${suffix}`, status: 'ACTIVE' } }),
        prisma.tenant.create({ data: { name: 'Ritual B', slug: `ritual-b-${suffix}`, status: 'ACTIVE' } }),
      ])
      const [userA, userB] = await Promise.all([
        prisma.user.create({ data: { email: `ritual-a-${suffix}@test.invalid`, normalizedEmail: `ritual-a-${suffix}@test.invalid`, passwordHash: 'integration' } }),
        prisma.user.create({ data: { email: `ritual-b-${suffix}@test.invalid`, normalizedEmail: `ritual-b-${suffix}@test.invalid`, passwordHash: 'integration' } }),
      ])
      const [membershipA, membershipB] = await Promise.all([
        prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: userA.id } }),
        prisma.tenantMembership.create({ data: { tenantId: tenantB.id, userId: userB.id } }),
      ])
      const ritualDate = new Date('2026-08-03T00:00:00.000Z')
      const [dayA, dayB] = await Promise.all([
        prisma.ritualDay.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, ritualDate } }),
        prisma.ritualDay.create({ data: { tenantId: tenantB.id, membershipId: membershipB.id, ritualDate } }),
      ])

      await expectPrismaCode(
        prisma.ritualDay.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, ritualDate } }),
        'P2002',
      )
      await expectPrismaCode(
        prisma.ritualDay.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, ritualDate: new Date('2026-08-04T00:00:00.000Z'), completedCycles: 8, remainingSeconds: 1800 } }),
        'P2039',
      )
      await expectPrismaCode(
        prisma.ritualDay.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, ritualDate: new Date('2026-08-05T00:00:00.000Z'), runningStartedAt: new Date('2026-08-03T10:30:00.000Z'), runningUntil: new Date('2026-08-03T10:00:00.000Z') } }),
        'P2039',
      )
      await expectPrismaCode(
        prisma.ritualCheck.create({ data: { ritualDayId: dayA.id, tenantId: tenantB.id, membershipId: membershipB.id, sectionKey: 'opening', itemKey: 'review-panel' } }),
        'P2003',
      )
      await expectPrismaCode(
        prisma.ritualCheck.create({ data: { ritualDayId: dayB.id, tenantId: tenantB.id, membershipId: membershipB.id, sectionKey: 'Opening', itemKey: 'review-panel' } }),
        'P2039',
      )
      await expect(
        prisma.ritualCheck.create({ data: { ritualDayId: dayA.id, tenantId: tenantA.id, membershipId: membershipA.id, sectionKey: 'opening', itemKey: 'review-panel' } }),
      ).resolves.toMatchObject({ ritualDayId: dayA.id, sectionKey: 'opening', itemKey: 'review-panel' })
      await expectPrismaCode(
        prisma.ritualCheck.create({ data: { ritualDayId: dayA.id, tenantId: tenantA.id, membershipId: membershipA.id, sectionKey: 'opening', itemKey: 'review-panel' } }),
        'P2002',
      )
    } finally {
      await moduleRef.close()
    }
  })
})
