import type { Prisma } from '../../../generated/prisma/client.js'

export abstract class ExecutionAdministrativeBlocker {
  abstract blockMembership(transaction: Prisma.TransactionClient, input: {
    tenantId: string
    membershipId: string
    actorMembershipId?: string
    actorPlatformAccessId?: string
    reason: string
    now: Date
  }): Promise<number>

  abstract blockTenant(transaction: Prisma.TransactionClient, input: {
    tenantId: string
    actorPlatformAccessId: string
    reason: string
    now: Date
  }): Promise<number>
}
