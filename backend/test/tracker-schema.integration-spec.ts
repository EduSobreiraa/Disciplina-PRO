import { randomUUID } from 'node:crypto'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'

async function expectPrismaCode(operation: Promise<unknown>, code: string) {
  await expect(operation).rejects.toMatchObject({ code })
}

describe('Tracker schema integration', () => {
  it('isolates behaviors, marks and private justifications by tenant membership', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule],
    }).compile()
    await moduleRef.init()
    const prisma = moduleRef.get(PrismaService)
    const suffix = randomUUID()

    try {
      const [tenantA, tenantB] = await Promise.all([
        prisma.tenant.create({ data: { name: 'Tracker A', slug: `tracker-a-${suffix}`, status: 'ACTIVE' } }),
        prisma.tenant.create({ data: { name: 'Tracker B', slug: `tracker-b-${suffix}`, status: 'ACTIVE' } }),
      ])
      const [userA, userB] = await Promise.all([
        prisma.user.create({ data: { email: `tracker-a-${suffix}@test.invalid`, normalizedEmail: `tracker-a-${suffix}@test.invalid`, passwordHash: 'integration' } }),
        prisma.user.create({ data: { email: `tracker-b-${suffix}@test.invalid`, normalizedEmail: `tracker-b-${suffix}@test.invalid`, passwordHash: 'integration' } }),
      ])
      const [membershipA, membershipB] = await Promise.all([
        prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: userA.id } }),
        prisma.tenantMembership.create({ data: { tenantId: tenantB.id, userId: userB.id } }),
      ])
      const [behaviorA, behaviorB] = await Promise.all([
        prisma.trackerBehavior.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, name: 'Leitura diária', normalizedName: 'leitura diária', position: 0 } }),
        prisma.trackerBehavior.create({ data: { tenantId: tenantB.id, membershipId: membershipB.id, name: 'Exercício', normalizedName: 'exercício', position: 0 } }),
      ])

      await expectPrismaCode(
        prisma.trackerBehavior.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, name: 'LEITURA   DIÁRIA', normalizedName: 'leitura diária', position: 1 } }),
        'P2002',
      )
      await expectPrismaCode(
        prisma.trackerBehavior.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, name: 'Nome inconsistente', normalizedName: 'outro nome', position: 1 } }),
        'P2039',
      )
      await expectPrismaCode(
        prisma.trackerBehavior.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, name: 'Arquivado inválido', normalizedName: 'arquivado inválido', position: 1, active: false } }),
        'P2039',
      )

      const trackedOn = new Date('2026-08-03T00:00:00.000Z')
      await expectPrismaCode(
        prisma.trackerMark.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, behaviorId: behaviorB.id, trackedOn, status: 'FAILED' } }),
        'P2003',
      )
      const mark = await prisma.trackerMark.create({
        data: { tenantId: tenantA.id, membershipId: membershipA.id, behaviorId: behaviorA.id, trackedOn, status: 'FAILED' },
      })
      await expectPrismaCode(
        prisma.trackerMark.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, behaviorId: behaviorA.id, trackedOn, status: 'COMPLETED' } }),
        'P2002',
      )
      await expectPrismaCode(
        prisma.trackerJustification.create({ data: { tenantId: tenantB.id, membershipId: membershipB.id, trackerMarkId: mark.id, text: 'Não pertence a este tenant.' } }),
        'P2003',
      )
      await expectPrismaCode(
        prisma.trackerJustification.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, trackerMarkId: mark.id, text: '   ' } }),
        'P2039',
      )
      await expect(
        prisma.trackerJustification.create({ data: { tenantId: tenantA.id, membershipId: membershipA.id, trackerMarkId: mark.id, text: 'Interrupção objetiva registrada pelo titular.' } }),
      ).resolves.toMatchObject({ trackerMarkId: mark.id, tenantId: tenantA.id, membershipId: membershipA.id })
    } finally {
      await moduleRef.close()
    }
  })
})
