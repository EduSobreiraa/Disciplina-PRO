import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import { InvitationAcceptanceRepository, type AcceptedInvitation } from '../application/invitation-acceptance.repository.js'
import { ExistingAccountAuthenticationRequiredError, InvitationInvalidError, MembershipAlreadyExistsError } from '../domain/invitation.errors.js'
import { ProgramAvailabilityProvisioner } from '../../programs/application/program-availability.provisioner.js'

interface LockedInvitation {
  id: string
  tenantId: string
  email: string
  normalizedEmail: string
  role: 'USER' | 'MANAGER' | 'CEO'
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
  expiresAt: Date
}

@Injectable()
export class PrismaInvitationAcceptanceRepository extends InvitationAcceptanceRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: ProgramAvailabilityProvisioner,
  ) { super() }

  acceptForNewIdentity(input: { tokenHash: string; passwordHash: string; now: Date }) {
    return this.mapConflicts(() => this.prisma.$transaction(async (transaction) => {
      const invitation = await this.lockValidInvitation(transaction, input)
      if (await transaction.user.findUnique({ where: { normalizedEmail: invitation.normalizedEmail }, select: { id: true } })) {
        throw new ExistingAccountAuthenticationRequiredError()
      }
      let user: { id: string }
      try {
        user = await transaction.user.create({
          data: { email: invitation.email.trim(), normalizedEmail: invitation.normalizedEmail, passwordHash: input.passwordHash },
          select: { id: true },
        })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ExistingAccountAuthenticationRequiredError()
        }
        throw error
      }
      return this.completeAcceptance(transaction, invitation, user.id, true, input.now)
    }))
  }

  acceptForExistingIdentity(input: { tokenHash: string; userId: string; now: Date }) {
    return this.mapConflicts(() => this.prisma.$transaction(async (transaction) => {
      const invitation = await this.lockValidInvitation(transaction, input)
      const user = await transaction.user.findFirst({
        where: { id: input.userId, normalizedEmail: invitation.normalizedEmail, status: 'ACTIVE' },
        select: { id: true },
      })
      if (!user) throw new InvitationInvalidError()
      return this.completeAcceptance(transaction, invitation, user.id, false, input.now)
    }))
  }

  private async lockValidInvitation(transaction: Prisma.TransactionClient, input: { tokenHash: string; now: Date }) {
    const rows = await transaction.$queryRaw<LockedInvitation[]>`
      SELECT
        id,
        tenant_id AS "tenantId",
        email,
        normalized_email AS "normalizedEmail",
        role::text AS role,
        status::text AS status,
        expires_at AS "expiresAt"
      FROM invitations
      WHERE token_hash = ${input.tokenHash}
      FOR UPDATE
    `
    const invitation = rows[0]
    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt <= input.now) throw new InvitationInvalidError()
    const tenant = await transaction.tenant.findUnique({ where: { id: invitation.tenantId }, select: { status: true } })
    const validTenant = invitation.role === 'CEO' ? tenant?.status === 'PENDING' : tenant?.status === 'ACTIVE'
    if (!validTenant) throw new InvitationInvalidError()
    return invitation
  }

  private async completeAcceptance(
    transaction: Prisma.TransactionClient,
    invitation: LockedInvitation,
    userId: string,
    identityCreated: boolean,
    now: Date,
  ): Promise<AcceptedInvitation> {
    if (await transaction.tenantMembership.count({ where: { tenantId: invitation.tenantId, userId } })) throw new MembershipAlreadyExistsError()
    const invitationTeams = await transaction.invitationTeam.findMany({
      where: { invitationId: invitation.id, tenantId: invitation.tenantId },
      select: { teamId: true, role: true, team: { select: { archivedAt: true } } },
    })
    if (invitationTeams.some(({ team }) => team.archivedAt !== null)) throw new InvitationInvalidError()
    const membership = await transaction.tenantMembership.create({
      data: { tenantId: invitation.tenantId, userId, role: invitation.role, createdAt: now },
      select: { id: true },
    })
    if (invitationTeams.length) {
      await transaction.teamMembership.createMany({ data: invitationTeams.map((team) => ({
        tenantId: invitation.tenantId,
        teamId: team.teamId,
        membershipId: membership.id,
        role: team.role,
        assignedAt: now,
      })) })
    }
    await transaction.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: now },
    })
    if (invitation.role === 'CEO') {
      if (invitationTeams.length) throw new InvitationInvalidError()
      await transaction.tenant.update({ where: { id: invitation.tenantId }, data: { status: 'ACTIVE' } })
    }
    await this.availability.provisionMembership(transaction, {
      tenantId: invitation.tenantId,
      membershipId: membership.id,
      now,
    })
    const action = invitation.role === 'CEO' ? 'FIRST_CEO_ACCEPTED' : 'INVITATION_ACCEPTED'
    await transaction.auditEvent.create({ data: {
      tenantId: invitation.tenantId,
      actorType: 'MEMBERSHIP',
      actorMembershipId: membership.id,
      targetMembershipId: membership.id,
      entityType: 'Invitation',
      entityId: invitation.id,
      action,
      metadata: { role: invitation.role, identityCreated, teamIds: invitationTeams.map(({ teamId }) => teamId) },
      occurredAt: now,
    } })
    return {
      invitationId: invitation.id,
      tenantId: invitation.tenantId,
      membershipId: membership.id,
      userId,
      role: invitation.role,
      identityCreated,
      acceptedAt: now,
    }
  }

  private async mapConflicts<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new MembershipAlreadyExistsError()
      throw error
    }
  }
}
