import { Injectable } from '@nestjs/common'
import type { Prisma } from '../../../generated/prisma/client.js'
import { ProgramAvailabilityProvisioner } from '../application/program-availability.provisioner.js'

@Injectable()
export class PrismaProgramAvailabilityProvisioner extends ProgramAvailabilityProvisioner {
  async provisionTenant(transaction: Prisma.TransactionClient, input: { tenantId: string; tenantProgramId: string; programId: string; now: Date }) {
    await this.lock(transaction, input.tenantId)
    return transaction.$executeRaw`
      INSERT INTO enrollments (
        id, tenant_id, tenant_program_id, program_id, membership_id,
        cycle_number, status, created_at, updated_at
      )
      SELECT uuidv7(), tm.tenant_id, ${input.tenantProgramId}::uuid, ${input.programId}::uuid,
             tm.id, 1, 'AVAILABLE'::"EnrollmentStatus", ${input.now}, ${input.now}
      FROM tenant_memberships tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.tenant_id = ${input.tenantId}::uuid
        AND tm.status = 'ACTIVE' AND u.status = 'ACTIVE'
      ON CONFLICT (tenant_program_id, membership_id, cycle_number) DO NOTHING
    `
  }

  async provisionMembership(transaction: Prisma.TransactionClient, input: { tenantId: string; membershipId: string; now: Date }) {
    await this.lock(transaction, input.tenantId)
    return transaction.$executeRaw`
      INSERT INTO enrollments (
        id, tenant_id, tenant_program_id, program_id, membership_id,
        cycle_number, status, created_at, updated_at
      )
      SELECT uuidv7(), tp.tenant_id, tp.id, tp.program_id, ${input.membershipId}::uuid,
             1, 'AVAILABLE'::"EnrollmentStatus", ${input.now}, ${input.now}
      FROM tenant_programs tp
      JOIN programs p ON p.id = tp.program_id
      JOIN program_versions pv ON pv.program_id = p.id AND pv.status = 'PUBLISHED'
      JOIN tenants t ON t.id = tp.tenant_id
      JOIN tenant_memberships tm ON tm.id = ${input.membershipId}::uuid AND tm.tenant_id = tp.tenant_id
      JOIN users u ON u.id = tm.user_id
      WHERE tp.tenant_id = ${input.tenantId}::uuid
        AND tp.status = 'ENABLED' AND p.status = 'ACTIVE' AND t.status = 'ACTIVE'
        AND tm.status = 'ACTIVE' AND u.status = 'ACTIVE'
      ON CONFLICT (tenant_program_id, membership_id, cycle_number) DO NOTHING
    `
  }

  private lock(transaction: Prisma.TransactionClient, tenantId: string) {
    return transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:availability:${tenantId}`}))`
  }
}
