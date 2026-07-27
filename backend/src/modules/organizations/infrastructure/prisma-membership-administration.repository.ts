import { Injectable } from '@nestjs/common'
import { Prisma, type TenantRole } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import { CeoReplacementRepository, MembershipAdministrationRepository, type MembershipActor, type TeamAssignmentRole } from '../application/membership-administration.repository.js'
import type { CurrentTenantContext } from '../application/organization-context.repository.js'
import { InvalidCeoReplacementError, InvalidMembershipTransitionError, InvalidTeamMembershipAssignmentError, MembershipNotFoundError, PlatformActorInactiveError, ResourceScopeDeniedError, TeamMembershipNotFoundError, TeamNotFoundError, TenantActorInactiveError, TenantNotFoundError } from '../domain/organization.errors.js'
import { ProgramAvailabilityProvisioner } from '../../programs/application/program-availability.provisioner.js'
import { ExecutionAdministrativeBlocker } from '../../execution/application/execution-blocker.js'

const membershipInclude = { user: { select: { email: true } } } as const

@Injectable()
export class PrismaMembershipAdministrationRepository extends MembershipAdministrationRepository implements CeoReplacementRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: ProgramAvailabilityProvisioner,
    private readonly executions: ExecutionAdministrativeBlocker,
  ) { super() }

  listScoped(context: CurrentTenantContext) {
    return this.prisma.$transaction(async (transaction) => {
      const actor = await this.assertTenantActor(transaction, context.tenantId, context.membershipId)
      const scoped = actor.role === 'CEO' ? {} : {
        teams: { some: { endedAt: null, team: { archivedAt: null, memberships: { some: { membershipId: actor.id, role: 'MANAGER' as const, endedAt: null } } } } },
      }
      return transaction.tenantMembership.findMany({ where: { tenantId: context.tenantId, ...scoped }, include: membershipInclude, orderBy: [{ role: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }] })
    })
  }

  assignTeam(input: MembershipActor & { teamId: string; targetMembershipId: string; role: TeamAssignmentRole }) {
    return this.prisma.$transaction(async (transaction) => {
      const actor = await this.assertTenantActor(transaction, input.tenantId, input.actorMembershipId)
      if (actor.role !== 'CEO') throw new ResourceScopeDeniedError()
      await this.lockTenant(transaction, input.tenantId)
      const [team, target] = await Promise.all([
        transaction.team.findFirst({ where: { id: input.teamId, tenantId: input.tenantId, archivedAt: null } }),
        transaction.tenantMembership.findFirst({ where: { id: input.targetMembershipId, tenantId: input.tenantId }, include: membershipInclude }),
      ])
      if (!team) throw new TeamNotFoundError()
      if (!target) throw new MembershipNotFoundError()
      if (target.status !== 'ACTIVE' || target.role === 'CEO' || (input.role === 'MANAGER' && target.role !== 'MANAGER')) throw new InvalidTeamMembershipAssignmentError()
      const existing = await transaction.teamMembership.findUnique({ where: { teamId_membershipId: { teamId: team.id, membershipId: target.id } } })
      const assignment = existing
        ? await transaction.teamMembership.update({ where: { id: existing.id }, data: { role: input.role, assignedAt: input.now, endedAt: null } })
        : await transaction.teamMembership.create({ data: { tenantId: input.tenantId, teamId: team.id, membershipId: target.id, role: input.role, assignedAt: input.now } })
      await this.auditMembership(transaction, input, target.id, assignment.id, 'TEAM_MEMBERSHIP_ASSIGNED', { teamId: team.id, role: input.role, reactivated: Boolean(existing) })
      return assignment
    })
  }

  endTeamAssignment(input: MembershipActor & { teamId: string; targetMembershipId: string }) {
    return this.prisma.$transaction(async (transaction) => {
      const actor = await this.assertTenantActor(transaction, input.tenantId, input.actorMembershipId)
      if (actor.role !== 'CEO') throw new ResourceScopeDeniedError()
      await this.lockTenant(transaction, input.tenantId)
      const team = await transaction.team.findFirst({ where: { id: input.teamId, tenantId: input.tenantId } })
      if (!team) throw new TeamNotFoundError()
      const assignment = await transaction.teamMembership.findFirst({ where: { tenantId: input.tenantId, teamId: team.id, membershipId: input.targetMembershipId, endedAt: null } })
      if (!assignment) throw new TeamMembershipNotFoundError()
      const ended = await transaction.teamMembership.update({ where: { id: assignment.id }, data: { endedAt: input.now } })
      await this.auditMembership(transaction, input, input.targetMembershipId, assignment.id, 'TEAM_MEMBERSHIP_ENDED', { teamId: team.id, role: assignment.role, reason: 'EXPLICIT' })
      return ended
    })
  }

  suspend(input: MembershipActor & { targetMembershipId: string; reason: string }) {
    return this.transition(input, ['ACTIVE'], 'SUSPENDED', 'MEMBERSHIP_SUSPENDED', true)
  }

  inactivate(input: MembershipActor & { targetMembershipId: string; reason: string }) {
    return this.transition(input, ['ACTIVE', 'SUSPENDED'], 'INACTIVE', 'MEMBERSHIP_INACTIVATED', false, true)
  }

  reactivate(input: MembershipActor & { targetMembershipId: string; reason: string }) {
    return this.transition(input, ['SUSPENDED', 'INACTIVE'], 'ACTIVE', 'MEMBERSHIP_REACTIVATED', false)
  }

  changeRole(input: MembershipActor & { targetMembershipId: string; role: 'USER' | 'MANAGER' }) {
    return this.prisma.$transaction(async (transaction) => {
      const actor = await this.assertTenantActor(transaction, input.tenantId, input.actorMembershipId)
      if (actor.role !== 'CEO') throw new ResourceScopeDeniedError()
      await this.lockTenant(transaction, input.tenantId)
      const target = await this.findTarget(transaction, input.tenantId, input.targetMembershipId)
      if (target.role === 'CEO' || target.status !== 'ACTIVE' || target.role === input.role) throw new InvalidMembershipTransitionError()
      let removedManagerScopes = 0
      if (input.role === 'USER') {
        const result = await transaction.teamMembership.updateMany({ where: { tenantId: input.tenantId, membershipId: target.id, role: 'MANAGER', endedAt: null }, data: { role: 'MEMBER' } })
        removedManagerScopes = result.count
      }
      const updated = await transaction.tenantMembership.update({ where: { id: target.id }, data: { role: input.role }, include: membershipInclude })
      await this.auditMembership(transaction, input, target.id, target.id, 'MEMBERSHIP_ROLE_CHANGED', { previousRole: target.role, role: input.role, removedManagerScopes })
      return updated
    })
  }

  replace(input: { tenantId: string; expectedCeoMembershipId: string; successorMembershipId: string; actorPlatformAccessId: string; reason: string; now: Date }) {
    return this.prisma.$transaction(async (transaction) => {
      await this.assertPlatformActor(transaction, input.actorPlatformAccessId)
      await this.lockTenant(transaction, input.tenantId)
      const tenant = await transaction.tenant.findUnique({ where: { id: input.tenantId } })
      if (!tenant) throw new TenantNotFoundError()
      if (tenant.status !== 'ACTIVE') throw new InvalidCeoReplacementError()
      const current = await transaction.tenantMembership.findFirst({ where: { tenantId: input.tenantId, role: 'CEO', status: 'ACTIVE' } })
      const successor = await transaction.tenantMembership.findFirst({ where: { id: input.successorMembershipId, tenantId: input.tenantId }, include: { user: { select: { status: true, email: true } } } })
      if (!current || current.id !== input.expectedCeoMembershipId || !successor || successor.id === current.id || successor.role === 'CEO' || successor.user.status !== 'ACTIVE') throw new InvalidCeoReplacementError()
      const activeLinks = await transaction.teamMembership.findMany({ where: { tenantId: input.tenantId, membershipId: current.id, endedAt: null }, select: { id: true, teamId: true, role: true } })
      if (activeLinks.length) {
        await transaction.teamMembership.updateMany({ where: { id: { in: activeLinks.map(({ id }) => id) } }, data: { endedAt: input.now } })
        await transaction.auditEvent.createMany({ data: activeLinks.map((link) => ({
          tenantId: input.tenantId, actorType: 'PLATFORM_ACCESS' as const, actorPlatformAccessId: input.actorPlatformAccessId,
          targetMembershipId: current.id, entityType: 'TeamMembership', entityId: link.id, action: 'TEAM_MEMBERSHIP_ENDED',
          metadata: { teamId: link.teamId, role: link.role, reason: 'CEO_REPLACED' }, occurredAt: input.now,
        })) })
      }
      await this.executions.blockMembership(transaction, {
        tenantId: input.tenantId,
        membershipId: current.id,
        actorPlatformAccessId: input.actorPlatformAccessId,
        reason: input.reason,
        now: input.now,
      })
      await transaction.tenantMembership.update({ where: { id: current.id }, data: { status: 'INACTIVE', deactivatedAt: input.now, suspendedAt: null } })
      const updated = await transaction.tenantMembership.update({ where: { id: successor.id }, data: { role: 'CEO', status: 'ACTIVE', suspendedAt: null, deactivatedAt: null }, include: membershipInclude })
      await transaction.auditEvent.create({ data: {
        tenantId: input.tenantId, actorType: 'PLATFORM_ACCESS', actorPlatformAccessId: input.actorPlatformAccessId,
        targetMembershipId: successor.id, entityType: 'TenantMembership', entityId: successor.id, action: 'TENANT_CEO_REPLACED',
        metadata: { predecessorMembershipId: current.id, successorMembershipId: successor.id, predecessorLinksEnded: activeLinks.length, reason: input.reason }, occurredAt: input.now,
      } })
      return updated
    })
  }

  private transition(input: MembershipActor & { targetMembershipId: string; reason: string }, from: Array<'ACTIVE' | 'SUSPENDED' | 'INACTIVE'>, to: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE', action: string, ceoOnly: boolean, endLinks = false) {
    return this.prisma.$transaction(async (transaction) => {
      const actor = await this.assertTenantActor(transaction, input.tenantId, input.actorMembershipId)
      if (ceoOnly && actor.role !== 'CEO') throw new ResourceScopeDeniedError()
      await this.lockTenant(transaction, input.tenantId)
      const target = await this.findTarget(transaction, input.tenantId, input.targetMembershipId)
      if (target.role === 'CEO' || !from.includes(target.status)) throw new InvalidMembershipTransitionError()
      if (actor.role === 'MANAGER') {
        if (target.role !== 'USER' || !(await this.managerHasScope(transaction, input.tenantId, actor.id, target.id, to === 'ACTIVE'))) throw new ResourceScopeDeniedError()
      } else if (actor.role !== 'CEO') throw new ResourceScopeDeniedError()
      let endedAssignments = 0
      if (endLinks) {
        const links = await transaction.teamMembership.findMany({ where: { tenantId: input.tenantId, membershipId: target.id, endedAt: null }, select: { id: true, teamId: true, role: true } })
        if (links.length) {
          await transaction.teamMembership.updateMany({ where: { id: { in: links.map(({ id }) => id) } }, data: { endedAt: input.now } })
          await transaction.auditEvent.createMany({ data: links.map((link) => ({
            tenantId: input.tenantId, actorType: 'MEMBERSHIP' as const, actorMembershipId: input.actorMembershipId,
            targetMembershipId: target.id, entityType: 'TeamMembership', entityId: link.id, action: 'TEAM_MEMBERSHIP_ENDED',
            metadata: { teamId: link.teamId, role: link.role, reason: 'MEMBERSHIP_INACTIVATED' }, occurredAt: input.now,
          })) })
          endedAssignments = links.length
        }
      }
      if (to !== 'ACTIVE') {
        await this.executions.blockMembership(transaction, {
          tenantId: input.tenantId,
          membershipId: target.id,
          actorMembershipId: input.actorMembershipId,
          reason: input.reason,
          now: input.now,
        })
      }
      const updated = await transaction.tenantMembership.update({ where: { id: target.id }, data: {
        status: to,
        suspendedAt: to === 'SUSPENDED' ? input.now : null,
        deactivatedAt: to === 'INACTIVE' ? input.now : null,
      }, include: membershipInclude })
      if (to === 'ACTIVE') {
        await this.availability.provisionMembership(transaction, {
          tenantId: input.tenantId,
          membershipId: target.id,
          now: input.now,
        })
      }
      await this.auditMembership(transaction, input, target.id, target.id, action, { previousStatus: target.status, status: to, reason: input.reason, endedAssignments })
      return updated
    })
  }

  private async assertTenantActor(transaction: Prisma.TransactionClient, tenantId: string, membershipId: string) {
    const actors = await transaction.$queryRaw<Array<{ id: string; role: TenantRole }>>`
      SELECT tm.id, tm.role FROM tenant_memberships tm JOIN tenants t ON t.id = tm.tenant_id JOIN users u ON u.id = tm.user_id
      WHERE tm.id = ${membershipId}::uuid AND tm.tenant_id = ${tenantId}::uuid AND tm.status = 'ACTIVE' AND t.status = 'ACTIVE' AND u.status = 'ACTIVE'
      FOR UPDATE OF tm
    `
    if (actors.length !== 1) throw new TenantActorInactiveError()
    return actors[0]
  }

  private async assertPlatformActor(transaction: Prisma.TransactionClient, id: string) {
    const actors = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT pa.id FROM platform_accesses pa JOIN users u ON u.id = pa.user_id
      WHERE pa.id = ${id}::uuid AND pa.status = 'ACTIVE' AND u.status = 'ACTIVE' FOR UPDATE OF pa
    `
    if (actors.length !== 1) throw new PlatformActorInactiveError()
  }

  private lockTenant(transaction: Prisma.TransactionClient, tenantId: string) {
    return transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:memberships:${tenantId}`}))`
  }

  private async findTarget(transaction: Prisma.TransactionClient, tenantId: string, membershipId: string) {
    const target = await transaction.tenantMembership.findFirst({ where: { id: membershipId, tenantId }, include: membershipInclude })
    if (!target) throw new MembershipNotFoundError()
    return target
  }

  private async managerHasScope(transaction: Prisma.TransactionClient, tenantId: string, actorId: string, targetId: string, historicalTarget: boolean) {
    const targetEndedAt = historicalTarget ? {} : { endedAt: null }
    const count = await transaction.team.count({ where: {
      tenantId, archivedAt: null,
      memberships: { some: { membershipId: actorId, role: 'MANAGER', endedAt: null } },
      AND: { memberships: { some: { membershipId: targetId, ...targetEndedAt } } },
    } })
    return count > 0
  }

  private auditMembership(transaction: Prisma.TransactionClient, input: MembershipActor, targetMembershipId: string, entityId: string, action: string, metadata: Prisma.InputJsonValue) {
    return transaction.auditEvent.create({ data: {
      tenantId: input.tenantId, actorType: 'MEMBERSHIP', actorMembershipId: input.actorMembershipId, targetMembershipId,
      entityType: action.startsWith('TEAM_') ? 'TeamMembership' : 'TenantMembership', entityId, action, metadata, occurredAt: input.now,
    } })
  }
}
