import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import { InvitationAdministrationRepository, type InvitationRecord, type TenantInvitationActor } from '../application/invitation-administration.repository.js'
import { FirstCeoInvitationUnavailableError, InvitationActorInactiveError, InvitationAlreadyPendingError, InvitationNotFoundError, InvitationNotPendingError, InvitationResourceScopeDeniedError, MembershipAlreadyExistsError } from '../domain/invitation.errors.js'

@Injectable()
export class PrismaInvitationAdministrationRepository extends InvitationAdministrationRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  listTenant(input: TenantInvitationActor & { now: Date }) {
    return this.prisma.$transaction(async (transaction) => {
      const actor = await this.assertTenantActor(transaction, input)
      await this.materializeExpired(transaction, input.tenantId, input.now)
      const invitations = await transaction.invitation.findMany({
        where: {
          tenantId: input.tenantId,
          ...(actor.role === 'MANAGER' ? { createdByMembershipId: actor.id } : {}),
        },
        include: { teams: { select: { teamId: true, role: true }, orderBy: { teamId: 'asc' } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
      return invitations satisfies InvitationRecord[]
    })
  }

  createTenant(input: Parameters<InvitationAdministrationRepository['createTenant']>[0]) {
    return this.mapCreateConflict(() => this.prisma.$transaction(async (transaction) => {
      const actor = await this.assertTenantActor(transaction, input)
      if (!['CEO', 'MANAGER'].includes(actor.role)) throw new InvitationActorInactiveError()
      if (actor.role === 'MANAGER' && (input.role !== 'USER' || input.teams.length === 0)) throw new InvitationResourceScopeDeniedError()
      await this.lockInvitationIdentity(transaction, input.tenantId, input.normalizedEmail)
      await this.assertNoMembership(transaction, input.tenantId, input.normalizedEmail)
      await this.assertAssignableTeams(transaction, input, actor.role)
      const invitation = await transaction.invitation.create({
        data: {
          tenantId: input.tenantId,
          email: input.email,
          normalizedEmail: input.normalizedEmail,
          role: input.role,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          createdAt: input.now,
          createdByMembershipId: actor.id,
          teams: {
            create: input.teams.map((team) => ({
              role: team.role,
              team: { connect: { id_tenantId: { id: team.teamId, tenantId: input.tenantId } } },
            })),
          },
        },
        include: { teams: { select: { teamId: true, role: true }, orderBy: { teamId: 'asc' } } },
      })
      await this.auditMembershipActor(transaction, input, invitation.id, 'INVITATION_CREATED', {
        role: invitation.role,
        teamIds: invitation.teams.map(({ teamId }) => teamId),
      })
      return invitation satisfies InvitationRecord
    }))
  }

  resendTenant(input: Parameters<InvitationAdministrationRepository['resendTenant']>[0]) {
    return this.prisma.$transaction(async (transaction) => {
      const actor = await this.assertTenantActor(transaction, input)
      const invitation = await this.findPendingOwned(transaction, input, actor.role)
      const updated = await transaction.invitation.update({
        where: { id: invitation.id },
        data: { tokenHash: input.tokenHash, expiresAt: input.expiresAt },
        include: { teams: { select: { teamId: true, role: true }, orderBy: { teamId: 'asc' } } },
      })
      await this.auditMembershipActor(transaction, input, invitation.id, 'INVITATION_RESENT', { role: invitation.role })
      return updated satisfies InvitationRecord
    })
  }

  revokeTenant(input: Parameters<InvitationAdministrationRepository['revokeTenant']>[0]) {
    return this.prisma.$transaction(async (transaction) => {
      const actor = await this.assertTenantActor(transaction, input)
      const invitation = await this.findPendingOwned(transaction, input, actor.role)
      const updated = await transaction.invitation.update({
        where: { id: invitation.id },
        data: { status: 'REVOKED', revokedAt: input.now },
        include: { teams: { select: { teamId: true, role: true }, orderBy: { teamId: 'asc' } } },
      })
      await this.auditMembershipActor(transaction, input, invitation.id, 'INVITATION_REVOKED', { role: invitation.role })
      return updated satisfies InvitationRecord
    })
  }

  createFirstCeo(input: Parameters<InvitationAdministrationRepository['createFirstCeo']>[0]) {
    return this.mapCreateConflict(() => this.prisma.$transaction(async (transaction) => {
      const platform = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT pa.id
        FROM platform_accesses pa
        JOIN users u ON u.id = pa.user_id
        WHERE pa.id = ${input.actorPlatformAccessId}::uuid
          AND pa.status = 'ACTIVE' AND pa.role = 'SUPER_ADMIN' AND u.status = 'ACTIVE'
        FOR UPDATE OF pa
      `
      if (platform.length !== 1) throw new InvitationActorInactiveError()
      await this.lockInvitationIdentity(transaction, input.tenantId, input.normalizedEmail)
      const tenant = await transaction.tenant.findUnique({ where: { id: input.tenantId }, select: { status: true } })
      if (!tenant || tenant.status !== 'PENDING') throw new FirstCeoInvitationUnavailableError()
      if (await transaction.tenantMembership.count({ where: { tenantId: input.tenantId } })) throw new FirstCeoInvitationUnavailableError()
      if (await transaction.invitation.count({ where: { tenantId: input.tenantId, role: 'CEO', status: 'PENDING' } })) throw new InvitationAlreadyPendingError()
      await this.assertNoMembership(transaction, input.tenantId, input.normalizedEmail)
      const invitation = await transaction.invitation.create({
        data: {
          tenantId: input.tenantId,
          email: input.email,
          normalizedEmail: input.normalizedEmail,
          role: 'CEO',
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          createdAt: input.now,
          createdByPlatformAccessId: platform[0].id,
        },
        include: { teams: { select: { teamId: true, role: true } } },
      })
      await transaction.auditEvent.create({ data: {
        tenantId: input.tenantId,
        actorType: 'PLATFORM_ACCESS',
        actorPlatformAccessId: platform[0].id,
        entityType: 'Invitation',
        entityId: invitation.id,
        action: 'FIRST_CEO_INVITATION_CREATED',
        metadata: { role: 'CEO' },
        occurredAt: input.now,
      } })
      return invitation satisfies InvitationRecord
    }))
  }

  private async assertTenantActor(transaction: Prisma.TransactionClient, input: TenantInvitationActor) {
    const actors = await transaction.$queryRaw<Array<{ id: string; role: 'USER' | 'MANAGER' | 'CEO' }>>`
      SELECT tm.id, tm.role::text AS role
      FROM tenant_memberships tm
      JOIN tenants t ON t.id = tm.tenant_id
      JOIN users u ON u.id = tm.user_id
      WHERE tm.id = ${input.actorMembershipId}::uuid
        AND tm.tenant_id = ${input.tenantId}::uuid
        AND tm.status = 'ACTIVE' AND t.status = 'ACTIVE' AND u.status = 'ACTIVE'
      FOR UPDATE OF tm
    `
    if (actors.length !== 1 || actors[0].role !== input.actorRole) throw new InvitationActorInactiveError()
    return actors[0]
  }

  private async assertNoMembership(transaction: Prisma.TransactionClient, tenantId: string, normalizedEmail: string) {
    if (await transaction.tenantMembership.count({ where: { tenantId, user: { normalizedEmail } } })) throw new MembershipAlreadyExistsError()
  }

  private async assertAssignableTeams(
    transaction: Prisma.TransactionClient,
    input: Parameters<InvitationAdministrationRepository['createTenant']>[0],
    actorRole: 'USER' | 'MANAGER' | 'CEO',
  ) {
    if (!input.teams.length) return
    const teamIds = input.teams.map(({ teamId }) => teamId)
    const activeTeams = await transaction.team.count({ where: { tenantId: input.tenantId, id: { in: teamIds }, archivedAt: null } })
    if (activeTeams !== teamIds.length) throw new InvitationNotFoundError()
    if (actorRole === 'MANAGER') {
      const managed = await transaction.teamMembership.count({
        where: {
          tenantId: input.tenantId,
          membershipId: input.actorMembershipId,
          teamId: { in: teamIds },
          role: 'MANAGER',
          endedAt: null,
        },
      })
      if (managed !== teamIds.length || input.teams.some(({ role }) => role !== 'MEMBER')) throw new InvitationResourceScopeDeniedError()
    }
  }

  private async findPendingOwned(
    transaction: Prisma.TransactionClient,
    input: TenantInvitationActor & { invitationId: string; now: Date },
    actorRole: 'USER' | 'MANAGER' | 'CEO',
  ) {
    const rows = await transaction.$queryRaw<Array<{ id: string; role: 'USER' | 'MANAGER' | 'CEO'; status: string; expiresAt: Date; createdByMembershipId: string | null }>>`
      SELECT id, role::text AS role, status::text AS status, expires_at AS "expiresAt", created_by_membership_id AS "createdByMembershipId"
      FROM invitations
      WHERE id = ${input.invitationId}::uuid AND tenant_id = ${input.tenantId}::uuid
      FOR UPDATE
    `
    const invitation = rows[0]
    if (!invitation) throw new InvitationNotFoundError()
    if (actorRole === 'MANAGER' && invitation.createdByMembershipId !== input.actorMembershipId) throw new InvitationResourceScopeDeniedError()
    if (invitation.status !== 'PENDING') throw new InvitationNotPendingError()
    if (invitation.expiresAt <= input.now) {
      await transaction.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED', expiredAt: input.now } })
      throw new InvitationNotPendingError()
    }
    return invitation
  }

  private materializeExpired(transaction: Prisma.TransactionClient, tenantId: string, now: Date) {
    return transaction.invitation.updateMany({
      where: { tenantId, status: 'PENDING', expiresAt: { lte: now } },
      data: { status: 'EXPIRED', expiredAt: now },
    })
  }

  private lockInvitationIdentity(transaction: Prisma.TransactionClient, tenantId: string, normalizedEmail: string) {
    return transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:invitation:${tenantId}:${normalizedEmail}`}))`
  }

  private auditMembershipActor(
    transaction: Prisma.TransactionClient,
    input: { tenantId: string; actorMembershipId: string; now: Date },
    invitationId: string,
    action: string,
    metadata: Prisma.InputJsonValue,
  ) {
    return transaction.auditEvent.create({ data: {
      tenantId: input.tenantId,
      actorType: 'MEMBERSHIP',
      actorMembershipId: input.actorMembershipId,
      entityType: 'Invitation',
      entityId: invitationId,
      action,
      metadata,
      occurredAt: input.now,
    } })
  }

  private async mapCreateConflict<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new InvitationAlreadyPendingError()
      throw error
    }
  }
}
