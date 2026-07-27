import { randomUUID } from 'node:crypto'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'

async function expectPrismaCode(operation: Promise<unknown>, code: string) {
  await expect(operation).rejects.toMatchObject({ code })
}

describe('Program catalog schema integration', () => {
  it('enforces version, tree, tenant, program, and availability invariants', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule],
    }).compile()
    await moduleRef.init()
    const prisma = moduleRef.get(PrismaService)
    const suffix = randomUUID()

    try {
      const [tenantA, tenantB] = await Promise.all([
        prisma.tenant.create({ data: { name: 'Catálogo A', slug: `catalog-a-${suffix}`, status: 'ACTIVE' } }),
        prisma.tenant.create({ data: { name: 'Catálogo B', slug: `catalog-b-${suffix}`, status: 'ACTIVE' } }),
      ])
      const [userA, userB] = await Promise.all([
        prisma.user.create({
          data: {
            email: `catalog-a-${suffix}@test.invalid`,
            normalizedEmail: `catalog-a-${suffix}@test.invalid`,
            passwordHash: 'integration-only',
          },
        }),
        prisma.user.create({
          data: {
            email: `catalog-b-${suffix}@test.invalid`,
            normalizedEmail: `catalog-b-${suffix}@test.invalid`,
            passwordHash: 'integration-only',
          },
        }),
      ])
      const [membershipA, membershipB] = await Promise.all([
        prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: userA.id } }),
        prisma.tenantMembership.create({ data: { tenantId: tenantB.id, userId: userB.id } }),
      ])
      const [programA, programB] = await Promise.all([
        prisma.program.create({
          data: { slug: `program-a-${suffix}`, name: 'Programa A', summary: 'Definição global do programa A.' },
        }),
        prisma.program.create({
          data: { slug: `program-b-${suffix}`, name: 'Programa B', summary: 'Definição global do programa B.' },
        }),
      ])
      const [versionA, versionB] = await Promise.all([
        prisma.programVersion.create({
          data: {
            programId: programA.id,
            versionNumber: 1,
            title: 'Programa A — versão 1',
            description: 'Versão publicável do programa A.',
            durationDays: 66,
          },
        }),
        prisma.programVersion.create({
          data: {
            programId: programB.id,
            versionNumber: 1,
            title: 'Programa B — versão 1',
            description: 'Rascunho do programa B.',
            durationDays: 30,
          },
        }),
      ])
      expect(versionA).toMatchObject({ status: 'DRAFT', publishedAt: null, archivedAt: null })

      await expectPrismaCode(prisma.programVersion.create({
        data: {
          programId: programA.id,
          versionNumber: 2,
          title: 'Segundo rascunho indevido',
          description: 'O índice parcial deve rejeitar este registro.',
          durationDays: 66,
        },
      }), 'P2002')

      const [phaseA, phaseB] = await Promise.all([
        prisma.programPhase.create({
          data: {
            programVersionId: versionA.id,
            key: 'fundacao',
            title: 'Fundação',
            description: 'Primeira fase do programa.',
            position: 1,
          },
        }),
        prisma.programPhase.create({
          data: {
            programVersionId: versionB.id,
            key: 'inicio',
            title: 'Início',
            description: 'Primeira fase do outro programa.',
            position: 1,
          },
        }),
      ])
      await prisma.programActivity.create({
        data: {
          programVersionId: versionA.id,
          programPhaseId: phaseA.id,
          key: 'ritual-diario',
          title: 'Ritual diário',
          description: 'Atividade global e reproduzível.',
          position: 1,
          type: 'CHECKLIST',
          frequency: 'DAILY',
          configuration: { items: 3 },
        },
      })
      await expectPrismaCode(prisma.programActivity.create({
        data: {
          programVersionId: versionB.id,
          programPhaseId: phaseA.id,
          key: 'cross-version',
          title: 'Atividade cruzada',
          description: 'Não pode usar fase de outra versão.',
          position: 2,
          type: 'TASK',
          frequency: 'ONCE',
        },
      }), 'P2003')
      await expectPrismaCode(prisma.programActivity.create({
        data: {
          programVersionId: versionB.id,
          programPhaseId: phaseB.id,
          key: 'invalid-configuration',
          title: 'Configuração inválida',
          description: 'A configuração precisa ser objeto.',
          position: 1,
          type: 'TASK',
          frequency: 'ONCE',
          configuration: ['not-an-object'],
        },
      }), 'P2039')

      const publishedAt = new Date()
      await prisma.programVersion.update({
        where: { id: versionA.id },
        data: { status: 'PUBLISHED', publishedAt },
      })
      await expectPrismaCode(prisma.programVersion.create({
        data: {
          programId: programA.id,
          versionNumber: 2,
          status: 'PUBLISHED',
          title: 'Publicação concorrente',
          description: 'Somente uma versão pode permanecer publicada.',
          durationDays: 66,
          publishedAt: new Date(Date.now() + 1_000),
        },
      }), 'P2002')
      await expectPrismaCode(prisma.programPhase.update({
        where: { id: phaseA.id },
        data: { title: 'Mutação indevida' },
      }), 'P2039')
      await expectPrismaCode(prisma.programPhase.update({
        where: { id: phaseA.id },
        data: { programVersionId: versionB.id },
      }), 'P2039')
      await expectPrismaCode(prisma.programVersion.update({
        where: { id: versionA.id },
        data: { title: 'Mutação indevida' },
      }), 'P2039')

      const tenantProgram = await prisma.tenantProgram.create({
        data: { tenantId: tenantA.id, programId: programA.id },
      })
      expect(tenantProgram).toMatchObject({ status: 'ENABLED', disabledAt: null })
      await expectPrismaCode(prisma.tenantProgram.create({
        data: { tenantId: tenantA.id, programId: programA.id },
      }), 'P2002')

      const enrollment = await prisma.enrollment.create({
        data: {
          tenantId: tenantA.id,
          tenantProgramId: tenantProgram.id,
          programId: programA.id,
          membershipId: membershipA.id,
        },
      })
      expect(enrollment).toMatchObject({
        status: 'AVAILABLE',
        cycleNumber: 1,
        programVersionId: null,
        timeZone: null,
        startedAt: null,
        startedOn: null,
      })
      await expectPrismaCode(prisma.enrollment.create({
        data: {
          tenantId: tenantA.id,
          tenantProgramId: tenantProgram.id,
          programId: programA.id,
          membershipId: membershipA.id,
        },
      }), 'P2002')
      await expectPrismaCode(prisma.enrollment.create({
        data: {
          tenantId: tenantA.id,
          tenantProgramId: tenantProgram.id,
          programId: programA.id,
          membershipId: membershipB.id,
        },
      }), 'P2003')
      await expectPrismaCode(prisma.enrollment.create({
        data: {
          tenantId: tenantA.id,
          tenantProgramId: tenantProgram.id,
          programId: programA.id,
          membershipId: membershipA.id,
          cycleNumber: 2,
          programVersionId: versionB.id,
          status: 'ACTIVE',
          timeZone: 'America/Bahia',
          startedAt: new Date(),
          startedOn: new Date(),
        },
      }), 'P2003')
      await expectPrismaCode(prisma.enrollment.create({
        data: {
          tenantId: tenantA.id,
          tenantProgramId: tenantProgram.id,
          programId: programA.id,
          membershipId: membershipA.id,
          cycleNumber: 2,
          programVersionId: versionA.id,
        },
      }), 'P2039')
    } finally {
      await moduleRef.close()
    }
  })
})
