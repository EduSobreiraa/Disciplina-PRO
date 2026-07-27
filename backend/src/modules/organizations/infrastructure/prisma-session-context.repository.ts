import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../database/prisma.service.js'
import { SessionContextRepository } from '../application/session-context.repository.js'

@Injectable()
export class PrismaSessionContextRepository extends SessionContextRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  async findByUserId(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        memberships: {
          where: { status: 'ACTIVE', tenant: { status: 'ACTIVE' } },
          select: {
            id: true,
            role: true,
            tenant: { select: { id: true, name: true, slug: true, timeZone: true } },
          },
          orderBy: [{ tenant: { name: 'asc' } }, { id: 'asc' }],
        },
        platformAccess: {
          where: { status: 'ACTIVE' },
          select: { id: true, role: true },
        },
      },
    })
    if (!user) return null
    return {
      user: { id: user.id, email: user.email },
      organizations: user.memberships.map(({ id, role, tenant }) => ({
        tenant,
        membership: { id, role },
      })),
      platformAccess: user.platformAccess,
    }
  }
}
