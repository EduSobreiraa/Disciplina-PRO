import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { CompleteActivityUseCase, GetPrivateResponseUseCase, PutPrivateResponseUseCase, RecordDailyUseCase } from '../src/modules/execution/application/execution-facts.use-cases.js'
import { GetEnrollmentUseCase } from '../src/modules/execution/application/execution.use-cases.js'
import { ActivityNotExecutableError, ExecutionBlockedError, InvalidExecutionDataError } from '../src/modules/execution/domain/execution.errors.js'
import type { CurrentTenantContext } from '../src/modules/organizations/application/organization-context.repository.js'
import { INTERNAL_EVENT_TYPES } from '../src/modules/events/application/internal-event.contracts.js'

describe('Execution facts integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let context: CurrentTenantContext
  let enrollmentId: string
  let activityId: string
  let oncePrivateActivityId: string
  let foreignActivityId: string
  const now = new Date('2026-07-10T15:00:00.000Z')

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const user = await prisma.user.create({ data: { email: `facts-${suffix}@test.invalid`, normalizedEmail: `facts-${suffix}@test.invalid`, passwordHash: 'integration' } })
    const tenant = await prisma.tenant.create({ data: { name: 'Facts', slug: `facts-${suffix}`, status: 'ACTIVE', timeZone: 'America/Bahia' } })
    const membership = await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id } })
    const program = await prisma.program.create({ data: { slug: `facts-${suffix}`, name: 'Facts', summary: 'Fatos.' } })
    const version = await prisma.programVersion.create({
      data: {
        programId: program.id,
        versionNumber: 1,
        title: 'Facts',
        description: 'Facts.',
        durationDays: 10,
        executionConfiguration: {
          dailyRecord: {
            pillars: [
              { key: 'disciplina', label: 'Disciplina', minimum: 0, maximum: 10 },
              { key: 'saude', label: 'Saúde', minimum: 0, maximum: 10 },
            ],
            requireAllPillars: true,
          },
        },
      },
    })
    const phase = await prisma.programPhase.create({ data: { programVersionId: version.id, key: 'fase', title: 'Fase', description: 'Fase.', position: 1 } })
    const activity = await prisma.programActivity.create({
      data: {
        programVersionId: version.id,
        programPhaseId: phase.id,
        key: 'reflexao',
        title: 'Reflexão',
        description: 'Privada.',
        position: 1,
        type: 'REFLECTION',
        frequency: 'DAILY',
        configuration: { privateResponse: { enabled: true, maximumPayloadBytes: 1024 } },
      },
    })
    activityId = activity.id
    oncePrivateActivityId = (await prisma.programActivity.create({
      data: {
        programVersionId: version.id,
        programPhaseId: phase.id,
        key: 'new-self-definition',
        title: 'Definição do Novo Eu',
        description: 'Definição privada persistente no ciclo.',
        position: 2,
        type: 'REFLECTION',
        frequency: 'ONCE',
        configuration: { privateResponse: { enabled: true, maximumPayloadBytes: 2048 } },
      },
    })).id
    await prisma.programVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
    const tenantProgram = await prisma.tenantProgram.create({ data: { tenantId: tenant.id, programId: program.id } })
    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId: tenant.id,
        tenantProgramId: tenantProgram.id,
        programId: program.id,
        membershipId: membership.id,
        programVersionId: version.id,
        status: 'ACTIVE',
        timeZone: tenant.timeZone,
        startedAt: new Date('2026-07-01T15:00:00.000Z'),
        startedOn: new Date('2026-07-01T00:00:00.000Z'),
      },
    })
    enrollmentId = enrollment.id
    context = { tenantId: tenant.id, membershipId: membership.id, userId: user.id, tenantRole: 'USER' }

    const foreignProgram = await prisma.program.create({ data: { slug: `foreign-facts-${suffix}`, name: 'Foreign', summary: 'Foreign.' } })
    const foreignVersion = await prisma.programVersion.create({ data: { programId: foreignProgram.id, versionNumber: 1, title: 'Foreign', description: 'Foreign.', durationDays: 3 } })
    const foreignPhase = await prisma.programPhase.create({ data: { programVersionId: foreignVersion.id, key: 'fase', title: 'Fase', description: 'Fase.', position: 1 } })
    foreignActivityId = (await prisma.programActivity.create({
      data: { programVersionId: foreignVersion.id, programPhaseId: foreignPhase.id, key: 'foreign', title: 'Foreign', description: 'Foreign.', position: 1, type: 'TASK', frequency: 'DAILY' },
    })).id
  })

  afterAll(async () => app.close())

  it('keeps activity occurrences and daily records idempotent under concurrency', async () => {
    const completions = await Promise.all([
      app.get(CompleteActivityUseCase).execute(context, enrollmentId, activityId, now),
      app.get(CompleteActivityUseCase).execute(context, enrollmentId, activityId, now),
    ])
    expect(completions[0]?.id).toBe(completions[1]?.id)
    expect(completions[0]).toMatchObject({ programDay: 10, occurrenceKey: 'day:10' })
    expect(await prisma.activityCompletion.count({ where: { enrollmentId } })).toBe(1)

    const scores = [{ pillarKey: 'disciplina', score: 8 }, { pillarKey: 'saude', score: 7 }]
    const records = await Promise.all([
      app.get(RecordDailyUseCase).execute(context, enrollmentId, scores, now),
      app.get(RecordDailyUseCase).execute(context, enrollmentId, scores, now),
    ])
    expect(records[0]?.id).toBe(records[1]?.id)
    expect(await prisma.dailyRecord.count({ where: { enrollmentId } })).toBe(1)
    expect(await prisma.pillarScore.count({ where: { dailyRecordId: records[0]?.id } })).toBe(2)
    const events = await prisma.internalEvent.findMany({
      where: {
        type: {
          in: [
            INTERNAL_EVENT_TYPES.activityCompletionRecorded,
            INTERNAL_EVENT_TYPES.dailyRecordSubmitted,
          ],
        },
        aggregateId: { in: [completions[0].id, records[0].id] },
      },
      orderBy: { type: 'asc' },
    })
    expect(events).toHaveLength(2)
    expect(JSON.stringify(events.map(({ payload }) => payload))).toContain(context.membershipId)
  })

  it('rejects invalid scores and activities from another version', async () => {
    await expect(app.get(RecordDailyUseCase).execute(context, enrollmentId, [{ pillarKey: 'disciplina', score: 20 }], now))
      .rejects.toBeInstanceOf(InvalidExecutionDataError)
    await expect(app.get(CompleteActivityUseCase).execute(context, enrollmentId, foreignActivityId, now))
      .rejects.toBeInstanceOf(ActivityNotExecutableError)
  })

  it('replaces private content without exposing payload through audit metadata', async () => {
    const privateResponses = app.get(PutPrivateResponseUseCase)
    const first = await privateResponses.execute(context, enrollmentId, activityId, { secret: 'primeiro conteúdo íntimo' }, now)
    const second = await privateResponses.execute(context, enrollmentId, activityId, { secret: 'segundo conteúdo íntimo' }, now)
    expect(second.id).toBe(first.id)
    expect(await prisma.privateActivityResponse.count({ where: { enrollmentId, activityId } })).toBe(1)
    await expect(app.get(GetPrivateResponseUseCase).execute(context, enrollmentId, activityId, now))
      .resolves.toMatchObject({ payload: { secret: 'segundo conteúdo íntimo' } })
    const audits = await prisma.auditEvent.findMany({ where: { entityId: first.id } })
    expect(JSON.stringify(audits.map(({ metadata }) => metadata))).not.toContain('conteúdo íntimo')
    const privateEvents = await prisma.internalEvent.findMany({
      where: { aggregateId: first.id },
    })
    expect(privateEvents).toHaveLength(0)
    expect(JSON.stringify(await prisma.internalEvent.findMany({
      where: { tenantId: context.tenantId },
      select: { payload: true },
    }))).not.toContain('conteúdo íntimo')
  })

  it('rebuilds the objective projection without exposing private payloads', async () => {
    const detail = await app.get(GetEnrollmentUseCase).execute(context, enrollmentId, now)
    expect(detail).toMatchObject({
      activityCompletions: [{
        activityId,
        programDay: 10,
        occurrenceKey: 'day:10',
      }],
      dailyRecords: [{
        programDay: 10,
        pillarScores: [
          { pillarKey: 'disciplina', score: 8 },
          { pillarKey: 'saude', score: 7 },
        ],
      }],
    })
    expect(detail.activities).toEqual(expect.arrayContaining([expect.objectContaining({
      id: activityId,
      key: 'reflexao',
      phaseKey: 'fase',
      frequency: 'DAILY',
    })]))
    expect(JSON.stringify(detail)).not.toContain('segundo conteúdo íntimo')
    expect(detail).not.toHaveProperty('privateResponses')
  })

  it('keeps an ONCE private response anchored to the cycle instead of the current day', async () => {
    const privateResponses = app.get(PutPrivateResponseUseCase)
    const first = await privateResponses.execute(context, enrollmentId, oncePrivateActivityId, { definition: 'primeira' }, now)
    const later = new Date('2026-07-20T15:00:00.000Z')
    const replaced = await privateResponses.execute(context, enrollmentId, oncePrivateActivityId, { definition: 'atualizada' }, later)
    expect(replaced.id).toBe(first.id)
    expect(replaced.programDay).toBe(1)
    await expect(app.get(GetPrivateResponseUseCase).execute(context, enrollmentId, oncePrivateActivityId, later))
      .resolves.toMatchObject({ id: first.id, programDay: 1, payload: { definition: 'atualizada' } })
  })

  it('rejects every new fact while paused', async () => {
    await prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: 'PAUSED' } })
    await expect(app.get(CompleteActivityUseCase).execute(context, enrollmentId, activityId, new Date('2026-07-11T15:00:00.000Z')))
      .rejects.toBeInstanceOf(ExecutionBlockedError)
    await expect(app.get(PutPrivateResponseUseCase).execute(context, enrollmentId, activityId, { secret: 'bloqueado' }, new Date('2026-07-11T15:00:00.000Z')))
      .rejects.toBeInstanceOf(ExecutionBlockedError)
  })
})
