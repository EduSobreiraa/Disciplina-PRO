import { randomUUID } from 'node:crypto'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'

async function expectPrismaCode(operation: Promise<unknown>, code: string) {
  await expect(operation).rejects.toMatchObject({ code })
}

describe('Invitations schema integration', () => {
  it('enforces lifecycle, creator exclusivity, pending uniqueness, and tenant-safe teams', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule],
    }).compile()
    await moduleRef.init()
    const prisma = moduleRef.get(PrismaService)
    const suffix = randomUUID()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
    const hash = (character: string) => character.repeat(64)

    try {
      const [tenantA, tenantB] = await Promise.all([
        prisma.tenant.create({ data: { name: 'Convites A', slug: `convites-a-${suffix}` } }),
        prisma.tenant.create({ data: { name: 'Convites B', slug: `convites-b-${suffix}` } }),
      ])
      const [creatorA, creatorB, platformUser] = await Promise.all([
        prisma.user.create({ data: { email: `creator-a-${suffix}@test.invalid`, normalizedEmail: `creator-a-${suffix}@test.invalid`, passwordHash: 'integration-only' } }),
        prisma.user.create({ data: { email: `creator-b-${suffix}@test.invalid`, normalizedEmail: `creator-b-${suffix}@test.invalid`, passwordHash: 'integration-only' } }),
        prisma.user.create({ data: { email: `platform-${suffix}@test.invalid`, normalizedEmail: `platform-${suffix}@test.invalid`, passwordHash: 'integration-only' } }),
      ])
      const [membershipA, membershipB, platformAccess] = await Promise.all([
        prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: creatorA.id } }),
        prisma.tenantMembership.create({ data: { tenantId: tenantB.id, userId: creatorB.id } }),
        prisma.platformAccess.create({ data: { userId: platformUser.id } }),
      ])
      const [teamA, teamB] = await Promise.all([
        prisma.team.create({ data: { tenantId: tenantA.id, name: 'Time A', normalizedName: 'time a' } }),
        prisma.team.create({ data: { tenantId: tenantB.id, name: 'Time B', normalizedName: 'time b' } }),
      ])

      const invitation = await prisma.invitation.create({
        data: {
          tenantId: tenantA.id,
          email: ` Member-${suffix}@Example.test `,
          normalizedEmail: `member-${suffix}@example.test`,
          role: 'USER',
          tokenHash: hash('a'),
          expiresAt,
          createdByMembershipId: membershipA.id,
        },
      })
      expect(invitation).toMatchObject({ status: 'PENDING', acceptedAt: null, revokedAt: null, expiredAt: null })
      await expect(prisma.invitationTeam.create({
        data: { tenantId: tenantA.id, invitationId: invitation.id, teamId: teamA.id },
      })).resolves.toMatchObject({ role: 'MEMBER' })

      await expectPrismaCode(prisma.invitation.create({
        data: {
          tenantId: tenantA.id,
          email: invitation.email,
          normalizedEmail: invitation.normalizedEmail,
          role: 'USER',
          tokenHash: hash('b'),
          expiresAt,
          createdByMembershipId: membershipA.id,
        },
      }), 'P2002')
      await expect(prisma.invitation.create({
        data: {
          tenantId: tenantB.id,
          email: invitation.email,
          normalizedEmail: invitation.normalizedEmail,
          role: 'USER',
          tokenHash: hash('c'),
          expiresAt,
          createdByMembershipId: membershipB.id,
        },
      })).resolves.toMatchObject({ tenantId: tenantB.id })

      await expectPrismaCode(prisma.invitation.create({
        data: {
          tenantId: tenantA.id,
          email: `cross-creator-${suffix}@example.test`,
          normalizedEmail: `cross-creator-${suffix}@example.test`,
          role: 'USER',
          tokenHash: hash('d'),
          expiresAt,
          createdByMembershipId: membershipB.id,
        },
      }), 'P2003')
      await expectPrismaCode(prisma.invitationTeam.create({
        data: { tenantId: tenantA.id, invitationId: invitation.id, teamId: teamB.id },
      }), 'P2003')

      await expectPrismaCode(prisma.invitation.create({
        data: {
          tenantId: tenantA.id,
          email: `wrong-creator-${suffix}@example.test`,
          normalizedEmail: `wrong-creator-${suffix}@example.test`,
          role: 'CEO',
          tokenHash: hash('e'),
          expiresAt,
          createdByMembershipId: membershipA.id,
        },
      }), 'P2039')
      const ceoInvitation = await prisma.invitation.create({
        data: {
          tenantId: tenantA.id,
          email: `ceo-${suffix}@example.test`,
          normalizedEmail: `ceo-${suffix}@example.test`,
          role: 'CEO',
          tokenHash: hash('f'),
          expiresAt,
          createdByPlatformAccessId: platformAccess.id,
        },
      })
      expect(ceoInvitation.createdByMembershipId).toBeNull()

      await expectPrismaCode(prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }), 'P2039')
      await expectPrismaCode(prisma.invitation.create({
        data: {
          tenantId: tenantA.id,
          email: `expired-${suffix}@example.test`,
          normalizedEmail: `expired-${suffix}@example.test`,
          role: 'USER',
          tokenHash: hash('1'),
          expiresAt: new Date(Date.now() - 1_000),
          createdByMembershipId: membershipA.id,
        },
      }), 'P2039')
      await expectPrismaCode(prisma.invitation.create({
        data: {
          tenantId: tenantA.id,
          email: `hash-${suffix}@example.test`,
          normalizedEmail: `hash-${suffix}@example.test`,
          role: 'USER',
          tokenHash: 'not-a-valid-hash',
          expiresAt,
          createdByMembershipId: membershipA.id,
        },
      }), 'P2039')

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      })
      await expect(prisma.invitation.create({
        data: {
          tenantId: tenantA.id,
          email: invitation.email,
          normalizedEmail: invitation.normalizedEmail,
          role: 'USER',
          tokenHash: hash('2'),
          expiresAt,
          createdByMembershipId: membershipA.id,
        },
      })).resolves.toMatchObject({ status: 'PENDING' })
    } finally {
      await moduleRef.close()
    }
  })
})
