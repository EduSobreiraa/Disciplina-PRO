import { randomUUID } from 'node:crypto'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'

async function expectPrismaCode(operation: Promise<unknown>, code: string) {
  await expect(operation).rejects.toMatchObject({ code })
}

describe('Internal events schema integration', () => {
  it('enforces immutable events, idempotent deliveries, valid states, and expired lease recovery', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule],
    }).compile()
    await moduleRef.init()
    const prisma = moduleRef.get(PrismaService)
    const suffix = randomUUID()

    try {
      const tenant = await prisma.tenant.create({
        data: { name: 'Eventos internos', slug: `internal-events-${suffix}`, status: 'ACTIVE' },
      })
      const aggregateId = randomUUID()
      const event = await prisma.internalEvent.create({
        data: {
          tenantId: tenant.id,
          type: 'execution.activity-completed',
          version: 1,
          aggregateType: 'Enrollment',
          aggregateId,
          sourceKey: `activity-completed:${suffix}`,
          payload: { enrollmentId: aggregateId, programDay: 1 },
          occurredAt: new Date(),
        },
      })

      await expectPrismaCode(prisma.internalEvent.create({
        data: {
          tenantId: tenant.id,
          type: event.type,
          version: 1,
          aggregateType: event.aggregateType,
          aggregateId,
          sourceKey: event.sourceKey,
          payload: {},
          occurredAt: new Date(),
        },
      }), 'P2002')
      await expectPrismaCode(prisma.internalEvent.create({
        data: {
          tenantId: tenant.id,
          type: 'execution.invalid-payload',
          version: 1,
          aggregateType: 'Enrollment',
          aggregateId,
          sourceKey: `invalid-payload:${suffix}`,
          payload: [],
          occurredAt: new Date(),
        },
      }), 'P2039')
      await expectPrismaCode(
        prisma.internalEvent.update({ where: { id: event.id }, data: { version: 2 } }),
        'P2039',
      )
      await expectPrismaCode(prisma.internalEvent.delete({ where: { id: event.id } }), 'P2039')

      const delivery = await prisma.internalEventDelivery.create({
        data: { internalEventId: event.id, consumer: 'gamification' },
      })
      await expectPrismaCode(prisma.internalEventDelivery.create({
        data: { internalEventId: event.id, consumer: delivery.consumer },
      }), 'P2002')
      await expectPrismaCode(prisma.internalEventDelivery.update({
        where: { id: delivery.id },
        data: { status: 'PROCESSING' },
      }), 'P2039')

      const lockedAt = new Date(Date.now() - 120_000)
      const lockedUntil = new Date(Date.now() - 60_000)
      await prisma.internalEventDelivery.update({
        where: { id: delivery.id },
        data: { status: 'PROCESSING', attempts: 1, lockedAt, lockedUntil },
      })
      const expired = await prisma.internalEventDelivery.findMany({
        where: { status: 'PROCESSING', lockedUntil: { lte: new Date() } },
      })
      expect(expired.map(({ id }) => id)).toContain(delivery.id)

      await prisma.internalEventDelivery.update({
        where: { id: delivery.id },
        data: { status: 'PENDING', lockedAt: null, lockedUntil: null, nextAttemptAt: new Date() },
      })
      await expectPrismaCode(prisma.internalEventDelivery.update({
        where: { id: delivery.id },
        data: { status: 'PROCESSED' },
      }), 'P2039')
      const processedAt = new Date()
      const processed = await prisma.internalEventDelivery.update({
        where: { id: delivery.id },
        data: { status: 'PROCESSED', processedAt },
      })
      expect(processed).toMatchObject({
        status: 'PROCESSED',
        attempts: 1,
        lockedAt: null,
        lockedUntil: null,
        processedAt,
      })
      await expectPrismaCode(
        prisma.internalEventDelivery.update({ where: { id: delivery.id }, data: { consumer: 'audit' } }),
        'P2039',
      )
      await expectPrismaCode(
        prisma.internalEventDelivery.delete({ where: { id: delivery.id } }),
        'P2039',
      )
    } finally {
      await moduleRef.close()
    }
  })
})
