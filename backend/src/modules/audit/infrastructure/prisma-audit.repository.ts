import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import type { InternalEventEnvelope } from '../../events/application/internal-event.contracts.js'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { AuditQueryRepository, type AuditPage, type AuditPageInput } from '../application/audit.repository.js'
import { AuditWriter, type DerivedAuditFact } from '../application/audit-writer.js'

const publicAuditSelect = {
  id: true,
  actorType: true,
  actorMembershipId: true,
  targetMembershipId: true,
  entityType: true,
  entityId: true,
  action: true,
  occurredAt: true,
} satisfies Prisma.AuditEventSelect

@Injectable()
export class PrismaAuditRepository extends AuditQueryRepository implements AuditWriter<Prisma.TransactionClient> {
  constructor(private readonly prisma: PrismaService) { super() }

  async findMine(context: CurrentTenantContext, input: AuditPageInput) {
    await this.assertActiveActor(context)
    return this.page({
      tenantId: context.tenantId,
      OR: [
        { actorMembershipId: context.membershipId },
        { targetMembershipId: context.membershipId },
      ],
    }, input)
  }

  async findTeam(context: CurrentTenantContext, teamId: string, input: AuditPageInput): Promise<AuditPage | null> {
    if (context.tenantRole !== 'CEO' && context.tenantRole !== 'MANAGER') return null
    await this.assertActiveActor(context, context.tenantRole)
    const scope = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        tenantId: context.tenantId,
        ...(context.tenantRole === 'CEO' ? {} : {
          archivedAt: null,
          memberships: {
            some: {
              membershipId: context.membershipId,
              role: 'MANAGER',
              endedAt: null,
            },
          },
        }),
      },
      select: {
        id: true,
        memberships: { select: { id: true, membershipId: true } },
      },
    })
    if (!scope) return null

    const membershipIds = [...new Set(scope.memberships.map(({ membershipId }) => membershipId))]
    const teamMembershipIds = scope.memberships.map(({ id }) => id)
    return this.page({
      tenantId: context.tenantId,
      OR: [
        { actorMembershipId: { in: membershipIds } },
        { targetMembershipId: { in: membershipIds } },
        { entityType: 'Team', entityId: teamId },
        { entityType: 'TeamMembership', entityId: { in: teamMembershipIds } },
      ],
    }, input)
  }

  async findTenant(context: CurrentTenantContext, input: AuditPageInput) {
    await this.assertActiveActor(context, 'CEO')
    return this.page({ tenantId: context.tenantId }, input)
  }

  async recordDerived(transaction: Prisma.TransactionClient, event: InternalEventEnvelope, fact: DerivedAuditFact) {
    if (!event.tenantId) throw new Error('Auditoria derivada exige evento de tenant')
    await transaction.auditEvent.createMany({
      data: [{
        tenantId: event.tenantId,
        internalEventId: event.id,
        actorType: 'SYSTEM',
        targetMembershipId: fact.targetMembershipId,
        entityType: fact.entityType,
        entityId: fact.entityId,
        action: fact.action,
        metadata: {},
        occurredAt: event.occurredAt,
      }],
      skipDuplicates: true,
    })
  }

  private async page(where: Prisma.AuditEventWhereInput, input: AuditPageInput): Promise<AuditPage> {
    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        select: publicAuditSelect,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.auditEvent.count({ where }),
    ])
    return { items, page: input.page, limit: input.limit, total }
  }

  private async assertActiveActor(context: CurrentTenantContext, role?: 'CEO' | 'MANAGER') {
    const actor = await this.prisma.tenantMembership.findFirst({
      where: {
        id: context.membershipId,
        tenantId: context.tenantId,
        userId: context.userId,
        status: 'ACTIVE',
        ...(role ? { role } : {}),
        tenant: { status: 'ACTIVE' },
        user: { status: 'ACTIVE' },
      },
      select: { id: true },
    })
    if (!actor) throw new Error('Contexto de auditoria inválido')
  }
}
