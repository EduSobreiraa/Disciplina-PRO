import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import { PlatformProgramActorInactiveError, ProgramEnablementNotAllowedError } from '../domain/program.errors.js'
import { TenantProgramAdministrationRepository } from '../application/tenant-program-administration.repository.js'
import { ProgramAvailabilityProvisioner } from '../application/program-availability.provisioner.js'

@Injectable()
export class PrismaTenantProgramAdministrationRepository extends TenantProgramAdministrationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: ProgramAvailabilityProvisioner,
  ) { super() }

  enable(input: { actorPlatformAccessId: string; tenantId: string; programId: string; now: Date }) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertActor(tx, input.actorPlatformAccessId)
      await this.lock(tx, input.tenantId, input.programId)
      const tenant = await tx.tenant.findUnique({ where: { id: input.tenantId }, select: { status: true } })
      const program = await tx.program.findUnique({ where: { id: input.programId }, select: { status: true } })
      const published = await tx.programVersion.count({ where: { programId: input.programId, status: 'PUBLISHED' } })
      if (tenant?.status !== 'ACTIVE' || program?.status !== 'ACTIVE' || published !== 1) throw new ProgramEnablementNotAllowedError()
      const existing = await tx.tenantProgram.findUnique({ where: { tenantId_programId: { tenantId: input.tenantId, programId: input.programId } } })
      const transitioned = !existing || existing.status === 'DISABLED'
      const relation = existing
        ? await tx.tenantProgram.update({ where: { id: existing.id }, data: { status: 'ENABLED', enabledAt: transitioned ? input.now : existing.enabledAt, disabledAt: null } })
        : await tx.tenantProgram.create({ data: { tenantId: input.tenantId, programId: input.programId, enabledAt: input.now, createdAt: input.now } })
      const provisioned = await this.availability.provisionTenant(tx, {
        tenantId: input.tenantId,
        tenantProgramId: relation.id,
        programId: input.programId,
        now: input.now,
      })
      if (transitioned) await this.audit(tx, input, 'TENANT_PROGRAM_ENABLED', relation.id, { provisionedEnrollments: provisioned })
      return { ...relation, provisionedEnrollments: provisioned }
    })
  }

  disable(input: { actorPlatformAccessId: string; tenantId: string; programId: string; now: Date }) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertActor(tx, input.actorPlatformAccessId)
      await this.lock(tx, input.tenantId, input.programId)
      const relation = await tx.tenantProgram.findUnique({ where: { tenantId_programId: { tenantId: input.tenantId, programId: input.programId } } })
      if (!relation) throw new ProgramEnablementNotAllowedError()
      if (relation.status === 'DISABLED') return { ...relation, provisionedEnrollments: 0 }
      const updated = await tx.tenantProgram.update({ where: { id: relation.id }, data: { status: 'DISABLED', disabledAt: input.now } })
      await this.audit(tx, input, 'TENANT_PROGRAM_DISABLED', relation.id, {})
      return { ...updated, provisionedEnrollments: 0 }
    })
  }

  private lock(tx: Prisma.TransactionClient, tenantId: string, programId: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:tenant-program:${tenantId}:${programId}`}))`
  }

  private async assertActor(tx: Prisma.TransactionClient, id: string) {
    const active = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT pa.id FROM platform_accesses pa JOIN users u ON u.id = pa.user_id
      WHERE pa.id = ${id}::uuid AND pa.status = 'ACTIVE' AND u.status = 'ACTIVE'
      FOR UPDATE OF pa
    `
    if (active.length !== 1) throw new PlatformProgramActorInactiveError()
  }

  private audit(tx: Prisma.TransactionClient, input: { actorPlatformAccessId: string; tenantId: string; programId: string }, action: string, entityId: string, metadata: Prisma.InputJsonObject) {
    return tx.auditEvent.create({ data: { tenantId: input.tenantId, actorType: 'PLATFORM_ACCESS', actorPlatformAccessId: input.actorPlatformAccessId, entityType: 'TenantProgram', entityId, action, metadata: { programId: input.programId, ...metadata } } })
  }
}
