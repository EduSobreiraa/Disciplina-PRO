import { Injectable } from '@nestjs/common'
import { Prisma, type TenantStatus } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import { TenantAdministrationRepository, type PlatformTenantAction } from '../application/tenant-administration.repository.js'
import { InvalidTenantTransitionError, PlatformActorInactiveError, TenantActiveCeoRequiredError, TenantNotFoundError, TenantSlugUnavailableError } from '../domain/organization.errors.js'
import { ExecutionAdministrativeBlocker } from '../../execution/application/execution-blocker.js'

@Injectable()
export class PrismaTenantAdministrationRepository extends TenantAdministrationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executions: ExecutionAdministrativeBlocker,
  ) { super() }

  create(input: { actorPlatformAccessId: string; name: string; slug: string; timeZone: string; now: Date }) {
    return this.prisma.$transaction(async (transaction) => {
      await this.assertActor(transaction, input.actorPlatformAccessId)
      try {
        const tenant = await transaction.tenant.create({ data: { name: input.name, slug: input.slug, timeZone: input.timeZone, createdAt: input.now } })
        await transaction.auditEvent.create({ data: { tenantId: tenant.id, actorType: 'PLATFORM_ACCESS', actorPlatformAccessId: input.actorPlatformAccessId, entityType: 'Tenant', entityId: tenant.id, action: 'TENANT_CREATED', metadata: { name: tenant.name, slug: tenant.slug, timeZone: tenant.timeZone } } })
        return tenant
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new TenantSlugUnavailableError()
        throw error
      }
    })
  }

  suspend(input: PlatformTenantAction) { return this.transition(input, ['ACTIVE'], 'SUSPENDED', 'TENANT_SUSPENDED') }

  reactivate(input: PlatformTenantAction) {
    return this.prisma.$transaction(async (transaction) => {
      await this.assertActor(transaction, input.actorPlatformAccessId)
      const tenant = await this.findTransitionTarget(transaction, input.tenantId, ['SUSPENDED'])
      const activeCeo = await transaction.tenantMembership.count({ where: { tenantId: tenant.id, role: 'CEO', status: 'ACTIVE', user: { status: 'ACTIVE' } } })
      if (activeCeo !== 1) throw new TenantActiveCeoRequiredError()
      const updated = await transaction.tenant.update({ where: { id: tenant.id }, data: { status: 'ACTIVE', suspendedAt: null } })
      await this.audit(transaction, input, 'TENANT_REACTIVATED')
      return updated
    })
  }

  close(input: PlatformTenantAction) { return this.transition(input, ['PENDING', 'ACTIVE', 'SUSPENDED'], 'CLOSED', 'TENANT_CLOSED') }

  private transition(input: PlatformTenantAction, from: TenantStatus[], to: TenantStatus, action: string) {
    return this.prisma.$transaction(async (transaction) => {
      await this.assertActor(transaction, input.actorPlatformAccessId)
      const tenant = await this.findTransitionTarget(transaction, input.tenantId, from)
      await this.executions.blockTenant(transaction, {
        tenantId: input.tenantId,
        actorPlatformAccessId: input.actorPlatformAccessId,
        reason: input.reason,
        now: input.now,
      })
      const updated = await transaction.tenant.update({ where: { id: tenant.id }, data: { status: to, suspendedAt: to === 'SUSPENDED' ? input.now : null, closedAt: to === 'CLOSED' ? input.now : null } })
      await this.audit(transaction, input, action)
      return updated
    })
  }

  private async assertActor(transaction: Prisma.TransactionClient, id: string) {
    const active = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT pa.id
      FROM platform_accesses pa
      JOIN users u ON u.id = pa.user_id
      WHERE pa.id = ${id}::uuid AND pa.status = 'ACTIVE' AND u.status = 'ACTIVE'
      FOR UPDATE OF pa
    `
    if (active.length !== 1) throw new PlatformActorInactiveError()
  }

  private async findTransitionTarget(transaction: Prisma.TransactionClient, id: string, states: TenantStatus[]) {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:tenant:${id}`}))`
    const tenant = await transaction.tenant.findUnique({ where: { id }, select: { id: true, status: true } })
    if (!tenant) throw new TenantNotFoundError()
    if (!states.includes(tenant.status)) throw new InvalidTenantTransitionError()
    return tenant
  }

  private audit(transaction: Prisma.TransactionClient, input: PlatformTenantAction, action: string) {
    return transaction.auditEvent.create({ data: { tenantId: input.tenantId, actorType: 'PLATFORM_ACCESS', actorPlatformAccessId: input.actorPlatformAccessId, entityType: 'Tenant', entityId: input.tenantId, action, metadata: { reason: input.reason } } })
  }
}
