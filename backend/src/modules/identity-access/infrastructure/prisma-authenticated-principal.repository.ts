import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../database/prisma.service.js'
import { AuthenticatedPrincipalRepository, PlatformAccessBoundary } from '../application/authenticated-principal.repository.js'

@Injectable()
export class PrismaAuthenticatedPrincipalRepository extends AuthenticatedPrincipalRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  async isSessionActive(input: { userId: string; sessionId: string; now: Date }) {
    const session = await this.prisma.authSession.findFirst({
      where: {
        id: input.sessionId,
        userId: input.userId,
        revokedAt: null,
        absoluteExpiresAt: { gt: input.now },
        user: { status: 'ACTIVE' },
      },
      select: { id: true },
    })
    return session !== null
  }
}

@Injectable()
export class PrismaPlatformAccessBoundary extends PlatformAccessBoundary {
  constructor(private readonly prisma: PrismaService) { super() }
  async hasActiveAccess(userId: string) {
    return (await this.prisma.platformAccess.count({ where: { userId, status: 'ACTIVE' } })) > 0
  }
}
