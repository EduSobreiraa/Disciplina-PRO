import type { Prisma } from '../../../generated/prisma/client.js'

export abstract class ProgramAvailabilityProvisioner {
  abstract provisionTenant(transaction: Prisma.TransactionClient, input: {
    tenantId: string
    tenantProgramId: string
    programId: string
    now: Date
  }): Promise<number>
  abstract provisionMembership(transaction: Prisma.TransactionClient, input: {
    tenantId: string
    membershipId: string
    now: Date
  }): Promise<number>
}
