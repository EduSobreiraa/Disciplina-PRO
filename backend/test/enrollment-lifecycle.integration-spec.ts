import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { AbandonEnrollmentUseCase, CompleteEnrollmentUseCase, GetEnrollmentUseCase, PauseEnrollmentUseCase, ResumeEnrollmentUseCase, StartEnrollmentUseCase } from '../src/modules/execution/application/execution.use-cases.js'
import { ExecutionAdministrativeBlocker } from '../src/modules/execution/application/execution-blocker.js'
import { EnrollmentNotFoundError, ExecutionBlockedError, InvalidEnrollmentTransitionError } from '../src/modules/execution/domain/execution.errors.js'
import type { CurrentTenantContext } from '../src/modules/organizations/application/organization-context.repository.js'
import { INTERNAL_EVENT_TYPES } from '../src/modules/events/application/internal-event.contracts.js'

describe('Enrollment lifecycle integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let context: CurrentTenantContext
  let enrollmentId: string
  let versionId: string
  let programId: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const user = await prisma.user.create({
      data: { email: `lifecycle-${suffix}@test.invalid`, normalizedEmail: `lifecycle-${suffix}@test.invalid`, passwordHash: 'integration' },
    })
    const tenant = await prisma.tenant.create({
      data: { name: 'Lifecycle', slug: `lifecycle-${suffix}`, status: 'ACTIVE', timeZone: 'America/New_York' },
    })
    const membership = await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id } })
    const program = await prisma.program.create({
      data: { slug: `lifecycle-${suffix}`, name: 'Lifecycle', summary: 'Programa de teste.' },
    })
    programId = program.id
    const version = await prisma.programVersion.create({
      data: {
        programId,
        versionNumber: 1,
        title: 'Versão inicial',
        description: 'Publicação inicial.',
        durationDays: 3,
        createdAt: new Date('2026-02-28T00:00:00.000Z'),
      },
    })
    await prisma.programVersion.update({
      where: { id: version.id },
      data: { status: 'PUBLISHED', publishedAt: new Date('2026-03-01T00:00:00.000Z') },
    })
    versionId = version.id
    const tenantProgram = await prisma.tenantProgram.create({ data: { tenantId: tenant.id, programId } })
    const enrollment = await prisma.enrollment.create({
      data: { tenantId: tenant.id, tenantProgramId: tenantProgram.id, programId, membershipId: membership.id },
    })
    enrollmentId = enrollment.id
    context = { tenantId: tenant.id, membershipId: membership.id, userId: user.id, tenantRole: 'USER' }
  })

  afterAll(async () => app.close())

  it('serializes starts, captures publication/timezone, and never changes either later', async () => {
    const now = new Date('2026-03-08T04:30:00.000Z')
    const start = app.get(StartEnrollmentUseCase)
    const attempts = await Promise.allSettled([
      start.execute(context, enrollmentId, now),
      start.execute(context, enrollmentId, now),
    ])
    expect(attempts.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
    const rejection = attempts.find(({ status }) => status === 'rejected') as PromiseRejectedResult
    expect(rejection.reason).toBeInstanceOf(InvalidEnrollmentTransitionError)

    const started = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } })
    expect(started).toMatchObject({
      status: 'ACTIVE',
      programVersionId: versionId,
      timeZone: 'America/New_York',
      startedOn: new Date('2026-03-07T00:00:00.000Z'),
    })
    expect(await prisma.auditEvent.count({ where: { entityId: enrollmentId, action: 'ENROLLMENT_STARTED' } })).toBe(1)

    await prisma.programVersion.update({ where: { id: versionId }, data: { status: 'ARCHIVED', archivedAt: now } })
    const successor = await prisma.programVersion.create({
      data: { programId, versionNumber: 2, title: 'Nova', description: 'Nova publicação.', durationDays: 20, createdAt: new Date('2026-03-08T00:00:00.000Z') },
    })
    await prisma.programVersion.update({
      where: { id: successor.id },
      data: { status: 'PUBLISHED', publishedAt: now },
    })
    await prisma.tenant.update({ where: { id: context.tenantId }, data: { timeZone: 'Asia/Tokyo' } })

    const detail = await app.get(GetEnrollmentUseCase).execute(context, enrollmentId, new Date('2026-03-09T16:00:00.000Z'))
    expect(detail).toMatchObject({
      programVersionId: versionId,
      timeZone: 'America/New_York',
      version: { durationDays: 3 },
      calendar: { today: new Date('2026-03-09T00:00:00.000Z'), programDay: 3, isCompletable: true },
    })
  })

  it('completes idempotently only on the final civil day', async () => {
    const complete = app.get(CompleteEnrollmentUseCase)
    const completed = await complete.execute(context, enrollmentId, new Date('2026-03-09T16:00:00.000Z'))
    expect(completed).toMatchObject({ status: 'COMPLETED', calendar: { programDay: 3, isCompletable: true } })
    const repeated = await complete.execute(context, enrollmentId, new Date('2026-03-10T16:00:00.000Z'))
    expect(repeated.completedAt).toEqual(completed.completedAt)
    expect(await prisma.auditEvent.count({ where: { entityId: enrollmentId, action: 'ENROLLMENT_COMPLETED' } })).toBe(1)
    const events = await prisma.internalEvent.findMany({
      where: { type: INTERNAL_EVENT_TYPES.enrollmentCompleted, aggregateId: enrollmentId },
    })
    expect(events).toHaveLength(1)
    expect(events[0]?.payload).toMatchObject({
      tenantId: context.tenantId,
      membershipId: context.membershipId,
      enrollmentId,
      programDay: 3,
    })
  })

  it('does not enumerate another membership enrollment', async () => {
    const foreign = { ...context, membershipId: '019f0000-0000-7000-8000-000000000099' }
    await expect(app.get(GetEnrollmentUseCase).execute(foreign, enrollmentId)).rejects.toBeInstanceOf(EnrollmentNotFoundError)
  })

  it('persists an abandonment reason without copying it into audit metadata', async () => {
    const first = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } })
    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId: first.tenantId,
        tenantProgramId: first.tenantProgramId,
        programId: first.programId,
        membershipId: first.membershipId,
        cycleNumber: 2,
      },
    })
    const now = new Date('2026-03-10T16:00:00.000Z')
    await app.get(StartEnrollmentUseCase).execute(context, enrollment.id, now)
    const abandoned = await app.get(AbandonEnrollmentUseCase).execute(context, enrollment.id, '  decisão reservada  ', now)
    expect(abandoned).toMatchObject({ status: 'ABANDONED', abandonmentReason: 'decisão reservada' })
    const audit = await prisma.auditEvent.findFirstOrThrow({ where: { entityId: enrollment.id, action: 'ENROLLMENT_ABANDONED' } })
    expect(audit.metadata).toEqual({})
  })

  it('opens one personal pause, keeps repeated requests idempotent, and resumes on the current civil date', async () => {
    const first = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } })
    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId: first.tenantId,
        tenantProgramId: first.tenantProgramId,
        programId: first.programId,
        membershipId: first.membershipId,
        cycleNumber: 3,
      },
    })
    const now = new Date('2026-03-11T16:00:00.000Z')
    await app.get(StartEnrollmentUseCase).execute(context, enrollment.id, now)
    const pause = app.get(PauseEnrollmentUseCase)
    await Promise.all([
      pause.execute(context, enrollment.id, 'Pausa pessoal', now),
      pause.execute(context, enrollment.id, 'Pausa repetida', now),
    ])
    expect(await prisma.enrollmentPause.count({ where: { enrollmentId: enrollment.id, resumedAt: null } })).toBe(1)
    expect(await prisma.enrollmentPauseCause.count({ where: { enrollmentId: enrollment.id, source: 'USER', resolvedAt: null } })).toBe(1)
    const open = await prisma.enrollmentPause.findFirstOrThrow({ where: { enrollmentId: enrollment.id, resumedAt: null } })
    expect(open.pauseStartsOn).toEqual(new Date('2026-03-13T00:00:00.000Z'))

    const resumed = await app.get(ResumeEnrollmentUseCase).execute(context, enrollment.id, new Date('2026-03-13T16:00:00.000Z'))
    expect(resumed.status).toBe('ACTIVE')
    expect(await prisma.enrollmentPause.findUniqueOrThrow({ where: { id: open.id } })).toMatchObject({
      resumedOn: new Date('2026-03-14T00:00:00.000Z'),
      resumedAt: expect.any(Date) as Date,
    })
  })

  it('preserves simultaneous administrative causes and does not resume while one remains', async () => {
    const enrollment = await prisma.enrollment.findFirstOrThrow({
      where: { tenantId: context.tenantId, membershipId: context.membershipId, cycleNumber: 3 },
    })
    const now = new Date('2026-03-14T16:00:00.000Z')
    await app.get(PauseEnrollmentUseCase).execute(context, enrollment.id, 'Nova pausa pessoal', now)
    const platformUser = await prisma.user.create({
      data: {
        email: `blocker-${Date.now()}@test.invalid`,
        normalizedEmail: `blocker-${Date.now()}@test.invalid`,
        passwordHash: 'integration',
      },
    })
    const platform = await prisma.platformAccess.create({ data: { userId: platformUser.id } })
    const blocker = app.get(ExecutionAdministrativeBlocker)
    await prisma.$transaction(async (tx) => {
      await blocker.blockMembership(tx, {
        tenantId: context.tenantId,
        membershipId: context.membershipId,
        actorPlatformAccessId: platform.id,
        reason: 'Bloqueio da membership',
        now,
      })
      await blocker.blockTenant(tx, {
        tenantId: context.tenantId,
        actorPlatformAccessId: platform.id,
        reason: 'Bloqueio do tenant',
        now,
      })
    })
    await expect(app.get(ResumeEnrollmentUseCase).execute(context, enrollment.id, now)).rejects.toBeInstanceOf(ExecutionBlockedError)
    const causes = await prisma.enrollmentPauseCause.findMany({ where: { enrollmentId: enrollment.id, resolvedAt: null } })
    expect(causes.map(({ source }) => source).sort()).toEqual(['MEMBERSHIP', 'TENANT'])
    expect((await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).status).toBe('PAUSED')
  })
})
