import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import type { CurrentTenantContext } from '../src/modules/organizations/application/organization-context.repository.js'
import { GetPersonalReportUseCase } from '../src/modules/reporting/application/reporting.use-cases.js'

describe('Reporting integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let context: CurrentTenantContext
  let foreignContext: CurrentTenantContext
  const privateMarker = 'conteúdo privado não pode aparecer no reporting'

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    context = await createReportFixture(`personal-${suffix}`, 2, 1, true)
    foreignContext = await createReportFixture(`foreign-${suffix}`, 1, 0, false)
  })

  afterAll(async () => app.close())

  it('derives the personal report only from objective facts in the current tenant', async () => {
    const report = await app.get(GetPersonalReportUseCase).execute(context)

    expect(report).toMatchObject({
      membershipId: context.membershipId,
      summary: {
        enrollments: 1,
        activeEnrollments: 1,
        completedEnrollments: 0,
        activityCompletions: 2,
        dailyRecords: 1,
      },
      programs: [{
        title: 'Programa objetivo',
        status: 'ACTIVE',
        durationDays: 10,
        activityCompletions: 2,
        dailyRecords: 1,
      }],
    })
    const serialized = JSON.stringify(report)
    expect(serialized).not.toContain(privateMarker)
    expect(serialized).not.toContain('privateResponses')
    expect(serialized).not.toContain(foreignContext.membershipId)
  })

  it('returns an independent projection for another tenant and rejects a stale actor', async () => {
    await expect(app.get(GetPersonalReportUseCase).execute(foreignContext)).resolves.toMatchObject({
      membershipId: foreignContext.membershipId,
      summary: { enrollments: 1, activityCompletions: 1, dailyRecords: 0 },
    })
    await prisma.tenantMembership.update({
      where: { id: foreignContext.membershipId },
      data: { status: 'INACTIVE', deactivatedAt: new Date() },
    })
    await expect(app.get(GetPersonalReportUseCase).execute(foreignContext))
      .rejects.toThrow('Contexto de reporting inválido')
  })

  async function createReportFixture(key: string, completions: number, records: number, withPrivateResponse: boolean) {
    const user = await prisma.user.create({
      data: { email: `${key}@test.invalid`, normalizedEmail: `${key}@test.invalid`, passwordHash: 'integration' },
    })
    const tenant = await prisma.tenant.create({ data: { name: key, slug: key, status: 'ACTIVE' } })
    const membership = await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id } })
    const program = await prisma.program.create({ data: { slug: key, name: 'Programa objetivo', summary: 'Resumo objetivo.' } })
    const version = await prisma.programVersion.create({
      data: { programId: program.id, versionNumber: 1, title: 'Programa objetivo', description: 'Descrição.', durationDays: 10 },
    })
    const phase = await prisma.programPhase.create({
      data: { programVersionId: version.id, key: 'phase', title: 'Fase', description: 'Fase.', position: 1 },
    })
    const activities = await Promise.all(Array.from({ length: Math.max(completions, 1) }, (_, index) =>
      prisma.programActivity.create({
        data: {
          programVersionId: version.id,
          programPhaseId: phase.id,
          key: `activity-${index + 1}`,
          title: `Atividade ${index + 1}`,
          description: 'Objetiva.',
          position: index + 1,
          type: 'TASK',
          frequency: 'DAILY',
        },
      })))
    const tenantProgram = await prisma.tenantProgram.create({ data: { tenantId: tenant.id, programId: program.id } })
    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId: tenant.id,
        tenantProgramId: tenantProgram.id,
        programId: program.id,
        membershipId: membership.id,
        programVersionId: version.id,
        status: 'ACTIVE',
        timeZone: 'America/Bahia',
        startedAt: new Date('2026-08-01T12:00:00.000Z'),
        startedOn: new Date('2026-08-01T00:00:00.000Z'),
      },
    })
    for (let index = 0; index < completions; index += 1) {
      await prisma.activityCompletion.create({
        data: {
          tenantId: tenant.id,
          enrollmentId: enrollment.id,
          programVersionId: version.id,
          activityId: activities[index].id,
          programDay: 1,
          programDate: new Date('2026-08-01T00:00:00.000Z'),
          occurrenceKey: 'day:1',
        },
      })
    }
    if (records > 0) {
      await prisma.dailyRecord.create({
        data: { tenantId: tenant.id, enrollmentId: enrollment.id, programDay: 1, programDate: new Date('2026-08-01T00:00:00.000Z') },
      })
    }
    if (withPrivateResponse) {
      await prisma.privateActivityResponse.create({
        data: {
          tenantId: tenant.id,
          enrollmentId: enrollment.id,
          programVersionId: version.id,
          activityId: activities[0].id,
          programDay: 1,
          programDate: new Date('2026-08-01T00:00:00.000Z'),
          payload: { secret: privateMarker },
        },
      })
    }
    return { tenantId: tenant.id, membershipId: membership.id, userId: user.id, tenantRole: 'USER' as const }
  }
})
