import { Injectable } from '@nestjs/common'
import type { CurrentPlatformContext, CurrentTenantContext, TenantRole } from './organization-context.repository.js'
import { CeoReplacementRepository, MembershipAdministrationRepository, type TeamAssignmentRole } from './membership-administration.repository.js'
import { normalizeOperationalReason, validateOrganizationId } from '../domain/tenant-policy.js'

function actor(context: CurrentTenantContext) {
  return { tenantId: context.tenantId, actorMembershipId: context.membershipId, actorRole: context.tenantRole, now: new Date() }
}

@Injectable()
export class ListMembershipsUseCase {
  constructor(private readonly memberships: MembershipAdministrationRepository) {}
  execute(context: CurrentTenantContext) { return this.memberships.listScoped(context) }
}

@Injectable()
export class AssignTeamMembershipUseCase {
  constructor(private readonly memberships: MembershipAdministrationRepository) {}
  execute(context: CurrentTenantContext, input: { teamId: string; membershipId: string; role: TeamAssignmentRole }) {
    return this.memberships.assignTeam({ ...actor(context), teamId: validateOrganizationId(input.teamId), targetMembershipId: validateOrganizationId(input.membershipId), role: input.role })
  }
}

@Injectable()
export class EndTeamMembershipUseCase {
  constructor(private readonly memberships: MembershipAdministrationRepository) {}
  execute(context: CurrentTenantContext, input: { teamId: string; membershipId: string }) {
    return this.memberships.endTeamAssignment({ ...actor(context), teamId: validateOrganizationId(input.teamId), targetMembershipId: validateOrganizationId(input.membershipId) })
  }
}

abstract class MembershipTransitionUseCase {
  constructor(protected readonly memberships: MembershipAdministrationRepository) {}
  protected input(context: CurrentTenantContext, membershipId: string, reason: string) {
    return { ...actor(context), targetMembershipId: validateOrganizationId(membershipId), reason: normalizeOperationalReason(reason) }
  }
}

@Injectable()
export class SuspendMembershipUseCase extends MembershipTransitionUseCase {
  constructor(memberships: MembershipAdministrationRepository) { super(memberships) }
  execute(context: CurrentTenantContext, membershipId: string, reason: string) { return this.memberships.suspend(this.input(context, membershipId, reason)) }
}
@Injectable()
export class InactivateMembershipUseCase extends MembershipTransitionUseCase {
  constructor(memberships: MembershipAdministrationRepository) { super(memberships) }
  execute(context: CurrentTenantContext, membershipId: string, reason: string) { return this.memberships.inactivate(this.input(context, membershipId, reason)) }
}
@Injectable()
export class ReactivateMembershipUseCase extends MembershipTransitionUseCase {
  constructor(memberships: MembershipAdministrationRepository) { super(memberships) }
  execute(context: CurrentTenantContext, membershipId: string, reason: string) { return this.memberships.reactivate(this.input(context, membershipId, reason)) }
}

@Injectable()
export class ChangeMembershipRoleUseCase {
  constructor(private readonly memberships: MembershipAdministrationRepository) {}
  execute(context: CurrentTenantContext, membershipId: string, role: Exclude<TenantRole, 'CEO'>) {
    return this.memberships.changeRole({ ...actor(context), targetMembershipId: validateOrganizationId(membershipId), role })
  }
}

@Injectable()
export class ReplaceCeoUseCase {
  constructor(private readonly replacements: CeoReplacementRepository) {}
  execute(context: CurrentPlatformContext, input: { tenantId: string; expectedCeoMembershipId: string; successorMembershipId: string; reason: string }) {
    return this.replacements.replace({
      tenantId: validateOrganizationId(input.tenantId),
      expectedCeoMembershipId: validateOrganizationId(input.expectedCeoMembershipId),
      successorMembershipId: validateOrganizationId(input.successorMembershipId),
      actorPlatformAccessId: context.platformAccessId,
      reason: normalizeOperationalReason(input.reason),
      now: new Date(),
    })
  }
}
