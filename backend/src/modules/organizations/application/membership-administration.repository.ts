import type { CurrentTenantContext, TenantRole } from './organization-context.repository.js'

export type MembershipStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
export type TeamAssignmentRole = 'MEMBER' | 'MANAGER'

export interface MembershipView {
  id: string
  tenantId: string
  userId: string
  role: TenantRole
  status: MembershipStatus
  suspendedAt: Date | null
  deactivatedAt: Date | null
  user: { email: string }
}

export interface MembershipActor {
  tenantId: string
  actorMembershipId: string
  actorRole: TenantRole
  now: Date
}

export abstract class MembershipAdministrationRepository {
  abstract listScoped(context: CurrentTenantContext): Promise<MembershipView[]>
  abstract assignTeam(input: MembershipActor & { teamId: string; targetMembershipId: string; role: TeamAssignmentRole }): Promise<unknown>
  abstract endTeamAssignment(input: MembershipActor & { teamId: string; targetMembershipId: string }): Promise<unknown>
  abstract suspend(input: MembershipActor & { targetMembershipId: string; reason: string }): Promise<MembershipView>
  abstract inactivate(input: MembershipActor & { targetMembershipId: string; reason: string }): Promise<MembershipView>
  abstract reactivate(input: MembershipActor & { targetMembershipId: string; reason: string }): Promise<MembershipView>
  abstract changeRole(input: MembershipActor & { targetMembershipId: string; role: Exclude<TenantRole, 'CEO'> }): Promise<MembershipView>
}

export abstract class CeoReplacementRepository {
  abstract replace(input: { tenantId: string; expectedCeoMembershipId: string; successorMembershipId: string; actorPlatformAccessId: string; reason: string; now: Date }): Promise<MembershipView>
}
