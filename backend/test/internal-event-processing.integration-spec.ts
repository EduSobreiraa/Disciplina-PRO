import { randomUUID } from 'node:crypto'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { Prisma } from '../src/generated/prisma/client.js'
import { InternalEventPublisher, type InternalEventEnvelope } from '../src/modules/events/application/internal-event.contracts.js'
import { InternalEventConsumerRegistry, type InternalEventConsumer } from '../src/modules/events/application/internal-event-consumer.js'
import { InternalEventProcessingRepository } from '../src/modules/events/application/internal-event-processing.repository.js'
import { GetInternalEventMetricsUseCase, ProcessInternalEventsUseCase, ReprocessInternalEventDeliveryUseCase } from '../src/modules/events/application/process-internal-events.use-case.js'
import { EventsModule } from '../src/modules/events/events.module.js'

describe('Internal event processing integration', () => {
  it('claims once, commits consequence atomically, retries safely, and recovers an expired lease', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
        PrismaModule,
        EventsModule,
      ],
    }).compile()
    await moduleRef.init()
    const prisma = moduleRef.get(PrismaService)
    const repository = moduleRef.get(InternalEventProcessingRepository)
    const publisher = moduleRef.get<InternalEventPublisher<Prisma.TransactionClient>>(InternalEventPublisher)
    const registry = moduleRef.get(InternalEventConsumerRegistry)
    const processor = moduleRef.get(ProcessInternalEventsUseCase)
    const reprocessor = moduleRef.get(ReprocessInternalEventDeliveryUseCase)
    const metrics = moduleRef.get(GetInternalEventMetricsUseCase)
    const suffix = randomUUID()

    try {
      const tenant = await prisma.tenant.create({
        data: { name: 'Processamento', slug: `event-processing-${suffix}`, status: 'ACTIVE' },
      })
      const eventType = `test.internal-event.${suffix}`
      let shouldFail = false
      const consumer: InternalEventConsumer = {
        name: `test-consumer-${suffix}`,
        supportedEvents: [{ type: eventType, version: 1 }],
        async handle(event: InternalEventEnvelope, transaction: unknown) {
          const tx = transaction as Prisma.TransactionClient
          await tx.auditEvent.create({
            data: {
              tenantId: event.tenantId,
              actorType: 'SYSTEM',
              entityType: 'InternalEvent',
              entityId: event.id,
              action: 'TEST_INTERNAL_EVENT_PROCESSED',
              metadata: { consumer: this.name },
              occurredAt: event.occurredAt,
            },
          })
          if (shouldFail) {
            throw Object.assign(new Error('mensagem que não pode ser persistida'), { code: 'TEST_HANDLER_FAILURE' })
          }
        },
      }
      registry.register(consumer)

      const createEvent = (sourceKey: string) => prisma.internalEvent.create({
        data: {
          tenantId: tenant.id,
          type: eventType,
          version: 1,
          aggregateType: 'ActivityCompletion',
          aggregateId: randomUUID(),
          sourceKey,
          payload: { tenantId: tenant.id },
          occurredAt: new Date(),
        },
      })

      const rolledBackSource = `rolled-back:${suffix}`
      await expect(prisma.$transaction(async (tx) => {
        await publisher.publish(tx, {
          tenantId: tenant.id,
          type: eventType,
          version: 1,
          aggregateType: 'ActivityCompletion',
          aggregateId: randomUUID(),
          sourceKey: rolledBackSource,
          payload: { tenantId: tenant.id },
          occurredAt: new Date(),
        })
        throw new Error('ROLLBACK_AFTER_OUTBOX_WRITE')
      })).rejects.toThrow('ROLLBACK_AFTER_OUTBOX_WRITE')
      expect(await prisma.internalEvent.count({
        where: { type: eventType, sourceKey: rolledBackSource },
      })).toBe(0)

      const concurrentEvent = await createEvent(`concurrent:${suffix}`)
      const [left, right] = await Promise.all([
        processor.execute({ batchSize: 10 }),
        processor.execute({ batchSize: 10 }),
      ])
      expect(left.processed + right.processed).toBe(1)
      expect(await prisma.auditEvent.count({
        where: { entityId: concurrentEvent.id, action: 'TEST_INTERNAL_EVENT_PROCESSED' },
      })).toBe(1)

      shouldFail = true
      const failingEvent = await createEvent(`failure:${suffix}`)
      const firstFailureAt = new Date()
      const firstFailure = await processor.execute({ maximumAttempts: 2 }, firstFailureAt)
      expect(firstFailure.retried).toBe(1)
      expect(await prisma.auditEvent.count({
        where: { entityId: failingEvent.id, action: 'TEST_INTERNAL_EVENT_PROCESSED' },
      })).toBe(0)
      const retriedDelivery = await prisma.internalEventDelivery.findUniqueOrThrow({
        where: {
          internalEventId_consumer: {
            internalEventId: failingEvent.id,
            consumer: consumer.name,
          },
        },
      })
      expect(retriedDelivery).toMatchObject({
        status: 'PENDING',
        attempts: 1,
        lastErrorCode: null,
      })

      const secondFailure = await processor.execute(
        { maximumAttempts: 2 },
        new Date(retriedDelivery.nextAttemptAt.getTime() + 1),
      )
      expect(secondFailure.failed).toBe(1)
      const failedDelivery = await prisma.internalEventDelivery.findUniqueOrThrow({
        where: { id: retriedDelivery.id },
      })
      expect(failedDelivery).toMatchObject({
        status: 'FAILED',
        attempts: 2,
        lastErrorCode: 'TEST_HANDLER_FAILURE',
      })
      expect(JSON.stringify(failedDelivery)).not.toContain('mensagem que não pode ser persistida')
      await expect(metrics.execute()).resolves.toMatchObject({
        failed: 1,
        expiredProcessing: 0,
        maximumAttempts: 2,
      })

      shouldFail = false
      expect(await reprocessor.execute(failedDelivery.id)).toBe(true)
      expect(await prisma.auditEvent.count({
        where: {
          entityId: failedDelivery.id,
          action: 'INTERNAL_EVENT_DELIVERY_REPROCESS_REQUESTED',
        },
      })).toBe(1)
      const recovered = await processor.execute({ maximumAttempts: 2 })
      expect(recovered.processed).toBe(1)
      expect(await prisma.auditEvent.count({
        where: { entityId: failingEvent.id, action: 'TEST_INTERNAL_EVENT_PROCESSED' },
      })).toBe(1)

      const leasedEvent = await createEvent(`expired-lease:${suffix}`)
      await repository.provision(consumer.name, consumer.supportedEvents, new Date())
      const leaseStart = new Date()
      const abandonedClaims = await repository.claim(consumer.name, {
        batchSize: 1,
        leaseMilliseconds: 1_000,
        now: leaseStart,
      })
      expect(abandonedClaims).toHaveLength(1)
      const afterExpiry = await processor.execute(
        { leaseMilliseconds: 1_000 },
        new Date(leaseStart.getTime() + 1_001),
      )
      expect(afterExpiry.processed).toBe(1)
      const leasedDelivery = await prisma.internalEventDelivery.findUniqueOrThrow({
        where: {
          internalEventId_consumer: {
            internalEventId: leasedEvent.id,
            consumer: consumer.name,
          },
        },
      })
      expect(leasedDelivery).toMatchObject({ status: 'PROCESSED', attempts: 2 })

      const failingConsumer: InternalEventConsumer = {
        name: `failing-consumer-${suffix}`,
        supportedEvents: [{ type: eventType, version: 1 }],
        handle() {
          return Promise.reject(Object.assign(new Error('falha independente'), { code: 'INDEPENDENT_FAILURE' }))
        },
      }
      registry.register(failingConsumer)
      const independentEvent = await createEvent(`consumer-isolation:${suffix}`)
      const independent = await processor.execute({ maximumAttempts: 2 })
      expect(independent.processed).toBe(1)
      expect(independent.retried).toBeGreaterThanOrEqual(1)
      expect(await prisma.auditEvent.count({
        where: { entityId: independentEvent.id, action: 'TEST_INTERNAL_EVENT_PROCESSED' },
      })).toBe(1)
      const independentDeliveries = await prisma.internalEventDelivery.findMany({
        where: { internalEventId: independentEvent.id },
        orderBy: { consumer: 'asc' },
      })
      expect(independentDeliveries).toEqual(expect.arrayContaining([
        expect.objectContaining({ consumer: consumer.name, status: 'PROCESSED' }),
        expect.objectContaining({ consumer: failingConsumer.name, status: 'PENDING' }),
      ]))
    } finally {
      await moduleRef.close()
    }
  })
})
