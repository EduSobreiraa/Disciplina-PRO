import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../database/prisma.service.js'
import { OrganizationContextRepository } from '../application/organization-context.repository.js'

@Injectable()
export class PrismaOrganizationContextRepository extends OrganizationContextRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async resolveTenantContext(input: { userId: string; tenantId: string }) {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        status: 'ACTIVE',
        tenant: { status: 'ACTIVE' },
        user: { status: 'ACTIVE' },
      },
      select: { id: true, tenantId: true, userId: true, role: true },
    })
    return membership
      ? { tenantId: membership.tenantId, membershipId: membership.id, userId: membership.userId, tenantRole: membership.role }
      : null
  }

  async resolvePlatformContext(userId: string) {
    const access = await this.prisma.platformAccess.findFirst({
      where: { userId, status: 'ACTIVE', user: { status: 'ACTIVE' } },
      select: { id: true, userId: true, role: true },
    })
    return access ? { platformAccessId: access.id, userId: access.userId, platformRole: access.role } : null
  }
}
