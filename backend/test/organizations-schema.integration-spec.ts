import { randomUUID } from 'node:crypto'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'

async function expectPrismaCode(operation: Promise<unknown>, code: string) {
  await expect(operation).rejects.toMatchObject({ code })
}

describe('Organizations schema integration', () => {
  it('enforces tenant isolation, active names and lifecycle timestamps in PostgreSQL', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule],
    }).compile()
    await moduleRef.init()
    const prisma = moduleRef.get(PrismaService)
    const suffix = randomUUID()

    try {
      const [tenantA, tenantB] = await Promise.all([
        prisma.tenant.create({ data: { name: 'Empresa A', slug: `empresa-a-${suffix}` } }),
        prisma.tenant.create({ data: { name: 'Empresa B', slug: `empresa-b-${suffix}` } }),
      ])
      const [userA, userB] = await Promise.all([
        prisma.user.create({
          data: {
            email: `member-a-${suffix}@disciplina.test`,
            normalizedEmail: `member-a-${suffix}@disciplina.test`,
            passwordHash: 'integration-only',
          },
        }),
        prisma.user.create({
          data: {
            email: `member-b-${suffix}@disciplina.test`,
            normalizedEmail: `member-b-${suffix}@disciplina.test`,
            passwordHash: 'integration-only',
          },
        }),
      ])
      const [membershipA, membershipB] = await Promise.all([
        prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: userA.id } }),
        prisma.tenantMembership.create({ data: { tenantId: tenantB.id, userId: userB.id } }),
      ])
      const [teamA, teamB] = await Promise.all([
        prisma.team.create({ data: { tenantId: tenantA.id, name: 'Operações', normalizedName: 'operações' } }),
        prisma.team.create({ data: { tenantId: tenantB.id, name: 'Operações', normalizedName: 'operações' } }),
      ])

      const valid = await prisma.teamMembership.create({
        data: { tenantId: tenantA.id, teamId: teamA.id, membershipId: membershipA.id },
      })
      expect(valid).toMatchObject({ tenantId: tenantA.id, teamId: teamA.id, membershipId: membershipA.id, role: 'MEMBER' })
      await expectPrismaCode(
        prisma.teamMembership.create({
          data: { tenantId: tenantA.id, teamId: teamA.id, membershipId: membershipA.id },
        }),
        'P2002',
      )

      await expectPrismaCode(
        prisma.teamMembership.create({
          data: { tenantId: tenantA.id, teamId: teamA.id, membershipId: membershipB.id },
        }),
        'P2003',
      )
      await expectPrismaCode(
        prisma.teamMembership.create({
          data: { tenantId: tenantA.id, teamId: teamB.id, membershipId: membershipA.id },
        }),
        'P2003',
      )
      expect(await prisma.teamMembership.count({ where: { id: { not: valid.id }, tenantId: tenantA.id } })).toBe(0)

      await expectPrismaCode(
        prisma.team.create({ data: { tenantId: tenantA.id, name: 'Operações duplicado', normalizedName: 'operações' } }),
        'P2002',
      )
      await prisma.team.update({ where: { id: teamA.id }, data: { archivedAt: new Date() } })
      await expect(
        prisma.team.create({ data: { tenantId: tenantA.id, name: 'Novas Operações', normalizedName: 'operações' } }),
      ).resolves.toMatchObject({ tenantId: tenantA.id, normalizedName: 'operações' })

      await expectPrismaCode(
        prisma.team.create({ data: { tenantId: tenantA.id, name: 'Inválido', normalizedName: ' nome   inválido ' } }),
        'P2039',
      )
      const future = new Date(Date.now() + 60_000)
      await expectPrismaCode(
        prisma.teamMembership.create({
          data: {
            tenantId: tenantB.id,
            teamId: teamB.id,
            membershipId: membershipB.id,
            assignedAt: future,
            endedAt: new Date(),
          },
        }),
        'P2039',
      )
    } finally {
      await moduleRef.close()
    }
  })
})
