import { randomUUID } from 'node:crypto'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'

async function expectPrismaCode(operation: Promise<unknown>, code: string) {
  await expect(operation).rejects.toMatchObject({ code })
}

describe('Execution schema integration', () => {
  it('enforces lifecycle, pause, version, occurrence, day, and privacy invariants', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule],
    }).compile()
    await moduleRef.init()
    const prisma = moduleRef.get(PrismaService)
    const suffix = randomUUID()
    try {
      const tenant = await prisma.tenant.create({ data: { name: 'Execução', slug: `execution-${suffix}`, status: 'ACTIVE' } })
      const user = await prisma.user.create({ data: { email: `${suffix}@test.invalid`, normalizedEmail: `${suffix}@test.invalid`, passwordHash: 'integration' } })
      const membership = await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id } })
      const program = await prisma.program.create({ data: { slug: `execution-${suffix}`, name: 'Programa', summary: 'Execução genérica.' } })
      const otherProgram = await prisma.program.create({ data: { slug: `execution-other-${suffix}`, name: 'Outro', summary: 'Outra versão.' } })
      const version = await prisma.programVersion.create({ data: { programId: program.id, versionNumber: 1, title: 'V1', description: 'Publicada.', durationDays: 66 } })
      const otherVersion = await prisma.programVersion.create({ data: { programId: otherProgram.id, versionNumber: 1, title: 'Outra', description: 'Publicada.', durationDays: 10 } })
      const phase = await prisma.programPhase.create({ data: { programVersionId: version.id, key: 'fase', title: 'Fase', description: 'Fase.', position: 1 } })
      const otherPhase = await prisma.programPhase.create({ data: { programVersionId: otherVersion.id, key: 'fase', title: 'Fase', description: 'Fase.', position: 1 } })
      const activity = await prisma.programActivity.create({ data: { programVersionId: version.id, programPhaseId: phase.id, key: 'acao', title: 'Ação', description: 'Ação.', position: 1, type: 'TASK', frequency: 'DAILY' } })
      const otherActivity = await prisma.programActivity.create({ data: { programVersionId: otherVersion.id, programPhaseId: otherPhase.id, key: 'outra', title: 'Outra', description: 'Outra.', position: 1, type: 'TASK', frequency: 'DAILY' } })
      await prisma.programVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
      await prisma.programVersion.update({ where: { id: otherVersion.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
      const tenantProgram = await prisma.tenantProgram.create({ data: { tenantId: tenant.id, programId: program.id } })
      const startedAt = new Date()
      const enrollment = await prisma.enrollment.create({ data: {
        tenantId: tenant.id, tenantProgramId: tenantProgram.id, programId: program.id, membershipId: membership.id,
        programVersionId: version.id, status: 'ACTIVE', timeZone: 'America/Bahia', startedAt, startedOn: startedAt,
      } })

      await expectPrismaCode(prisma.enrollment.create({ data: {
        tenantId: tenant.id, tenantProgramId: tenantProgram.id, programId: program.id, membershipId: membership.id,
        programVersionId: version.id, cycleNumber: 2, status: 'PAUSED', timeZone: 'America/Bahia', startedAt, startedOn: startedAt,
      } }), 'P2002')
      const pause = await prisma.enrollmentPause.create({ data: { tenantId: tenant.id, enrollmentId: enrollment.id, pauseStartsOn: new Date(Date.now() + 86_400_000) } })
      await expectPrismaCode(prisma.enrollmentPause.create({ data: { tenantId: tenant.id, enrollmentId: enrollment.id, pauseStartsOn: new Date(Date.now() + 86_400_000) } }), 'P2002')
      await prisma.enrollmentPauseCause.create({ data: {
        tenantId: tenant.id, enrollmentId: enrollment.id, enrollmentPauseId: pause.id,
        source: 'USER', reason: 'Pausa solicitada', createdByMembershipId: membership.id,
      } })
      await expectPrismaCode(prisma.enrollmentPauseCause.create({ data: {
        tenantId: tenant.id, enrollmentId: enrollment.id, enrollmentPauseId: pause.id,
        source: 'USER', reason: 'Duplicada', createdByMembershipId: membership.id,
      } }), 'P2002')

      const completion = await prisma.activityCompletion.create({ data: {
        tenantId: tenant.id, enrollmentId: enrollment.id, programVersionId: version.id, activityId: activity.id,
        programDay: 1, programDate: startedAt, occurrenceKey: 'day:1',
      } })
      await expectPrismaCode(prisma.activityCompletion.create({ data: {
        tenantId: tenant.id, enrollmentId: enrollment.id, programVersionId: version.id, activityId: activity.id,
        programDay: 1, programDate: startedAt, occurrenceKey: 'day:1',
      } }), 'P2002')
      await expectPrismaCode(prisma.activityCompletion.create({ data: {
        tenantId: tenant.id, enrollmentId: enrollment.id, programVersionId: otherVersion.id, activityId: otherActivity.id,
        programDay: 1, programDate: startedAt, occurrenceKey: 'day:1',
      } }), 'P2003')
      await expectPrismaCode(prisma.activityCompletion.update({ where: { id: completion.id }, data: { programDay: 2 } }), 'P2039')

      const daily = await prisma.dailyRecord.create({ data: { tenantId: tenant.id, enrollmentId: enrollment.id, programDay: 1, programDate: startedAt } })
      await prisma.pillarScore.create({ data: { tenantId: tenant.id, dailyRecordId: daily.id, pillarKey: 'disciplina', score: 8 } })
      await expectPrismaCode(prisma.dailyRecord.create({ data: { tenantId: tenant.id, enrollmentId: enrollment.id, programDay: 1, programDate: startedAt } }), 'P2002')
      await prisma.privateActivityResponse.create({ data: {
        tenantId: tenant.id, enrollmentId: enrollment.id, programVersionId: version.id, activityId: activity.id,
        programDay: 1, programDate: startedAt, payload: { reflection: 'privada' },
      } })
      await expectPrismaCode(prisma.privateActivityResponse.create({ data: {
        tenantId: tenant.id, enrollmentId: enrollment.id, programVersionId: otherVersion.id, activityId: otherActivity.id,
        programDay: 2, programDate: startedAt, payload: { reflection: 'cruzada' },
      } }), 'P2003')
    } finally {
      await moduleRef.close()
    }
  })
})
