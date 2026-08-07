import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import { TeamAdministrationRepository, type TenantTeamActor } from '../application/team-administration.repository.js'
import { InvalidTeamTransitionError, TeamNameUnavailableError, TeamNotFoundError, TenantActorInactiveError } from '../domain/organization.errors.js'

@Injectable()
export class PrismaTeamAdministrationRepository extends TeamAdministrationRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  listCurrent(input: Omit<TenantTeamActor, 'now'>) {
    return this.prisma.$transaction(async (transaction) => {
      await this.assertActor(transaction, input)
      return transaction.team.findMany({ where: { tenantId: input.tenantId }, orderBy: [{ archivedAt: 'asc' }, { normalizedName: 'asc' }, { id: 'asc' }] })
    })
  }

  async create(input: TenantTeamActor & { name: string; normalizedName: string }) {
    return this.mapNameConflict(() => this.prisma.$transaction(async (transaction) => {
      await this.assertActor(transaction, input)
      await this.lockTenant(transaction, input.tenantId)
      const team = await transaction.team.create({ data: { tenantId: input.tenantId, name: input.name, normalizedName: input.normalizedName, createdAt: input.now } })
      await this.auditTeam(transaction, input, team.id, 'TEAM_CREATED', { name: team.name })
      return team
    }))
  }

  async update(input: TenantTeamActor & { teamId: string; name: string; normalizedName: string }) {
    return this.mapNameConflict(() => this.prisma.$transaction(async (transaction) => {
      await this.assertActor(transaction, input)
      await this.lockTenant(transaction, input.tenantId)
      const team = await this.findTeam(transaction, input.tenantId, input.teamId)
      if (team.archivedAt) throw new InvalidTeamTransitionError()
      const updated = await transaction.team.update({ where: { id: team.id }, data: { name: input.name, normalizedName: input.normalizedName } })
      await this.auditTeam(transaction, input, team.id, 'TEAM_UPDATED', { previousName: team.name, name: updated.name })
      return updated
    }))
  }

  archive(input: TenantTeamActor & { teamId: string }) {
    return this.prisma.$transaction(async (transaction) => {
      await this.assertActor(transaction, input)
      await this.lockTenant(transaction, input.tenantId)
      const team = await this.findTeam(transaction, input.tenantId, input.teamId)
      if (team.archivedAt) throw new InvalidTeamTransitionError()
      const activeLinks = await transaction.teamMembership.findMany({
        where: { tenantId: input.tenantId, teamId: team.id, endedAt: null },
        select: { id: true, membershipId: true, role: true },
      })
      if (activeLinks.length) {
        await transaction.teamMembership.updateMany({ where: { id: { in: activeLinks.map(({ id }) => id) }, endedAt: null }, data: { endedAt: input.now } })
        await transaction.auditEvent.createMany({ data: activeLinks.map((link) => ({
          tenantId: input.tenantId,
          actorType: 'MEMBERSHIP' as const,
          actorMembershipId: input.actorMembershipId,
          targetMembershipId: link.membershipId,
          entityType: 'TeamMembership',
          entityId: link.id,
          action: 'TEAM_MEMBERSHIP_ENDED',
          metadata: { teamId: team.id, role: link.role, reason: 'TEAM_ARCHIVED' },
          occurredAt: input.now,
        })) })
      }
      const updated = await transaction.team.update({ where: { id: team.id }, data: { archivedAt: input.now } })
      await this.auditTeam(transaction, input, team.id, 'TEAM_ARCHIVED', { endedMemberships: activeLinks.length })
      return updated
    })
  }

  async restore(input: TenantTeamActor & { teamId: string }) {
    return this.mapNameConflict(() => this.prisma.$transaction(async (transaction) => {
      await this.assertActor(transaction, input)
      await this.lockTenant(transaction, input.tenantId)
      const team = await this.findTeam(transaction, input.tenantId, input.teamId)
      if (!team.archivedAt) throw new InvalidTeamTransitionError()
      const updated = await transaction.team.update({ where: { id: team.id }, data: { archivedAt: null } })
      await this.auditTeam(transaction, input, team.id, 'TEAM_RESTORED', { name: team.name })
      return updated
    }))
  }

  private async assertActor(transaction: Prisma.TransactionClient, input: { tenantId: string; actorMembershipId: string }) {
    const actor = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT tm.id
      FROM tenant_memberships tm
      JOIN tenants t ON t.id = tm.tenant_id
      JOIN users u ON u.id = tm.user_id
      WHERE tm.id = ${input.actorMembershipId}::uuid
        AND tm.tenant_id = ${input.tenantId}::uuid
        AND tm.role = 'CEO' AND tm.status = 'ACTIVE'
        AND t.status = 'ACTIVE' AND u.status = 'ACTIVE'
      FOR UPDATE OF tm
    `
    if (actor.length !== 1) throw new TenantActorInactiveError()
  }

  private lockTenant(transaction: Prisma.TransactionClient, tenantId: string) {
    return transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:teams:${tenantId}`}))`
  }

  private async findTeam(transaction: Prisma.TransactionClient, tenantId: string, teamId: string) {
    const team = await transaction.team.findFirst({ where: { id: teamId, tenantId } })
    if (!team) throw new TeamNotFoundError()
    return team
  }

  private auditTeam(transaction: Prisma.TransactionClient, input: TenantTeamActor, teamId: string, action: string, metadata: Prisma.InputJsonValue) {
    return transaction.auditEvent.create({ data: {
      tenantId: input.tenantId,
      actorType: 'MEMBERSHIP',
      actorMembershipId: input.actorMembershipId,
      entityType: 'Team',
      entityId: teamId,
      action,
      metadata,
      occurredAt: input.now,
    } })
  }

  private async mapNameConflict<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new TeamNameUnavailableError()
      throw error
    }
  }
}
