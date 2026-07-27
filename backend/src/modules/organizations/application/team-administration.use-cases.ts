import { Injectable } from '@nestjs/common'
import type { CurrentTenantContext } from './organization-context.repository.js'
import { TeamAdministrationRepository } from './team-administration.repository.js'
import { normalizeTeamName, validateTeamId } from '../domain/team-policy.js'

@Injectable()
export class ListTeamsUseCase {
  constructor(private readonly teams: TeamAdministrationRepository) {}
  execute(context: CurrentTenantContext) {
    return this.teams.listCurrent({ tenantId: context.tenantId, actorMembershipId: context.membershipId })
  }
}

@Injectable()
export class CreateTeamUseCase {
  constructor(private readonly teams: TeamAdministrationRepository) {}
  execute(context: CurrentTenantContext, input: { name: string }) {
    const names = normalizeTeamName(input.name)
    return this.teams.create({ tenantId: context.tenantId, actorMembershipId: context.membershipId, ...names, now: new Date() })
  }
}

@Injectable()
export class UpdateTeamUseCase {
  constructor(private readonly teams: TeamAdministrationRepository) {}
  execute(context: CurrentTenantContext, input: { teamId: string; name: string }) {
    const names = normalizeTeamName(input.name)
    return this.teams.update({ tenantId: context.tenantId, actorMembershipId: context.membershipId, teamId: validateTeamId(input.teamId), ...names, now: new Date() })
  }
}

@Injectable()
export class ArchiveTeamUseCase {
  constructor(private readonly teams: TeamAdministrationRepository) {}
  execute(context: CurrentTenantContext, teamId: string) {
    return this.teams.archive({ tenantId: context.tenantId, actorMembershipId: context.membershipId, teamId: validateTeamId(teamId), now: new Date() })
  }
}

@Injectable()
export class RestoreTeamUseCase {
  constructor(private readonly teams: TeamAdministrationRepository) {}
  execute(context: CurrentTenantContext, teamId: string) {
    return this.teams.restore({ tenantId: context.tenantId, actorMembershipId: context.membershipId, teamId: validateTeamId(teamId), now: new Date() })
  }
}
