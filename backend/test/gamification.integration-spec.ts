import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { INTERNAL_EVENT_TYPES } from '../src/modules/events/application/internal-event.contracts.js'
import { ProcessInternalEventsUseCase } from '../src/modules/events/application/process-internal-events.use-case.js'
import { GetMyGamificationUseCase } from '../src/modules/gamification/application/gamification.use-cases.js'
import type { CurrentTenantContext } from '../src/modules/organizations/application/organization-context.repository.js'

describe('Gamification integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let context: CurrentTenantContext
  let foreignContext: CurrentTenantContext
  let eventId: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)

    const suffix = randomUUID()
    const user = await prisma.user.create({
      data: { email: `gamification-${suffix}@test.invalid`, normalizedEmail: `gamification-${suffix}@test.invalid`, passwordHash: 'integration' },
    })
    const tenant = await prisma.tenant.create({
      data: { name: 'Gamification', slug: `gamification-${suffix}`, status: 'ACTIVE' },
    })
    const membership = await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id } })
    context = { tenantId: tenant.id, membershipId: membership.id, userId: user.id, tenantRole: 'USER' }

    const foreignUser = await prisma.user.create({
      data: { email: `gamification-foreign-${suffix}@test.invalid`, normalizedEmail: `gamification-foreign-${suffix}@test.invalid`, passwordHash: 'integration' },
    })
    const foreignTenant = await prisma.tenant.create({
      data: { name: 'Foreign gamification', slug: `gamification-foreign-${suffix}`, status: 'ACTIVE' },
    })
    const foreignMembership = await prisma.tenantMembership.create({ data: { tenantId: foreignTenant.id, userId: foreignUser.id } })
    foreignContext = { tenantId: foreignTenant.id, membershipId: foreignMembership.id, userId: foreignUser.id, tenantRole: 'USER' }

    const program = await prisma.program.create({ data: { slug: `gamification-${suffix}`, name: 'Gamification', summary: 'Integration.' } })
    const version = await prisma.programVersion.create({
      data: { programId: program.id, versionNumber: 1, title: 'Gamification', description: 'Integration.', durationDays: 1 },
    })
    await prisma.programVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
    const tenantProgram = await prisma.tenantProgram.create({ data: { tenantId: tenant.id, programId: program.id } })
    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId: tenant.id,
        tenantProgramId: tenantProgram.id,
        programId: program.id,
        membershipId: membership.id,
        programVersionId: version.id,
        status: 'COMPLETED',
        timeZone: 'America/Bahia',
        startedAt: new Date('2026-07-25T12:00:00.000Z'),
        startedOn: new Date('2026-07-25T00:00:00.000Z'),
        completedAt: new Date(),
      },
    })
    const event = await prisma.internalEvent.create({
      data: {
        tenantId: tenant.id,
        type: INTERNAL_EVENT_TYPES.enrollmentCompleted,
        version: 1,
        aggregateType: 'Enrollment',
        aggregateId: enrollment.id,
        sourceKey: `enrollment-completed:${enrollment.id}`,
        payload: { membershipId: membership.id, enrollmentId: enrollment.id },
        occurredAt: new Date(),
      },
    })
    eventId = event.id
  })

  afterAll(async () => app.close())

  it('processes the same fact once under concurrent workers and derives the projection', async () => {
    const processor = app.get(ProcessInternalEventsUseCase)
    const [left, right] = await Promise.all([
      processor.execute({ batchSize: 10 }),
      processor.execute({ batchSize: 10 }),
    ])
    expect(left.processed + right.processed).toBeGreaterThanOrEqual(1)
    expect(await prisma.xpTransaction.count({ where: { internalEventId: eventId } })).toBe(1)

    const view = await app.get(GetMyGamificationUseCase).execute(context)
    expect(view).toMatchObject({
      balance: 500,
      level: { key: 'soldier' },
      transactions: [{ amount: 500, eventType: INTERNAL_EVENT_TYPES.enrollmentCompleted }],
    })
    expect(view.achievements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'first-xp' }),
      expect.objectContaining({ key: 'xp-500' }),
    ]))
  })

  it('isolates the individual projection by tenant and membership', async () => {
    await expect(app.get(GetMyGamificationUseCase).execute(foreignContext)).resolves.toMatchObject({
      balance: 0,
      transactions: [],
      achievements: [],
    })
  })

  it('rejects cross-tenant facts and keeps the ledger immutable', async () => {
    await expect(prisma.xpTransaction.create({
      data: {
        tenantId: foreignContext.tenantId,
        membershipId: foreignContext.membershipId,
        internalEventId: eventId,
        ruleKey: `invalid-${randomUUID()}`,
        eventType: INTERNAL_EVENT_TYPES.enrollmentCompleted,
        amount: 500,
        description: 'Cross tenant',
        occurredAt: new Date(),
      },
    })).rejects.toMatchObject({ code: 'P2003' })

    const transaction = await prisma.xpTransaction.findFirstOrThrow({ where: { internalEventId: eventId } })
    await expect(prisma.xpTransaction.update({
      where: { id: transaction.id },
      data: { amount: 999 },
    })).rejects.toBeDefined()
    await expect(prisma.xpTransaction.delete({ where: { id: transaction.id } })).rejects.toBeDefined()
  })

  it('does not copy private or arbitrary content into the projection', async () => {
    const serialized = JSON.stringify(await app.get(GetMyGamificationUseCase).execute(context))
    expect(serialized).not.toContain('payload')
    expect(serialized).not.toContain('enrollmentId')
    expect(serialized).not.toContain(context.membershipId)
  })
})
