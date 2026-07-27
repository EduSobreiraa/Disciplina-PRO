import type { InvitationTeamInput, InvitationTenantRole } from '../domain/invitation-policy.js'

export interface TenantInvitationActor {
  tenantId: string
  actorMembershipId: string
  actorRole: 'USER' | 'MANAGER' | 'CEO'
}

export interface InvitationRecord {
  id: string
  tenantId: string
  email: string
  role: 'USER' | 'MANAGER' | 'CEO'
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  teams: Array<{ teamId: string; role: 'MEMBER' | 'MANAGER' }>
}

export abstract class InvitationAdministrationRepository {
  abstract listTenant(input: TenantInvitationActor & { now: Date }): Promise<InvitationRecord[]>
  abstract createTenant(input: TenantInvitationActor & {
    email: string
    normalizedEmail: string
    role: InvitationTenantRole
    teams: InvitationTeamInput[]
    tokenHash: string
    expiresAt: Date
    now: Date
  }): Promise<InvitationRecord>
  abstract resendTenant(input: TenantInvitationActor & { invitationId: string; tokenHash: string; expiresAt: Date; now: Date }): Promise<InvitationRecord>
  abstract revokeTenant(input: TenantInvitationActor & { invitationId: string; now: Date }): Promise<InvitationRecord>
  abstract createFirstCeo(input: {
    tenantId: string
    actorPlatformAccessId: string
    email: string
    normalizedEmail: string
    tokenHash: string
    expiresAt: Date
    now: Date
  }): Promise<InvitationRecord>
}
