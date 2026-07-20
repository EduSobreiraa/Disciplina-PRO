import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../database/prisma.service.js'
import { Prisma } from '../../../generated/prisma/client.js'
import {
  BootstrapAlreadyCompletedError,
  BootstrapUserDisabledError,
  EmailAlreadyInUseError,
} from '../domain/identity.errors.js'
import { IdentityRepository } from '../application/identity.repository.js'

@Injectable()
export class PrismaIdentityRepository extends IdentityRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async createUser(input: { email: string; normalizedEmail: string; passwordHash: string }) {
    try {
      return await this.prisma.user.create({ data: input, select: { id: true, email: true } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new EmailAlreadyInUseError()
      throw error
    }
  }

  findForLogin(normalizedEmail: string) {
    return this.prisma.user.findUnique({ where: { normalizedEmail }, select: { id: true, passwordHash: true, status: true } })
  }

  bootstrapSuperAdmin(input: { email: string; normalizedEmail: string; passwordHash: string }) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('disciplina-pro:platform-bootstrap'))`

      const activeAccess = await transaction.platformAccess.count({ where: { status: 'ACTIVE' } })
      if (activeAccess > 0) throw new BootstrapAlreadyCompletedError()

      const existingUser = await transaction.user.findUnique({ where: { normalizedEmail: input.normalizedEmail } })
      if (existingUser?.status === 'DISABLED') throw new BootstrapUserDisabledError()

      const user = existingUser ?? (await transaction.user.create({ data: input }))
      const access = await transaction.platformAccess.create({ data: { userId: user.id } })

      await transaction.auditEvent.create({
        data: {
          actorType: 'SYSTEM',
          entityType: 'PlatformAccess',
          entityId: access.id,
          action: 'PLATFORM_ACCESS_BOOTSTRAPPED',
          metadata: { userId: user.id },
        },
      })

      return { userId: user.id, platformAccessId: access.id, email: user.email }
    })
  }
}
