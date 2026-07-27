export interface TeamView {
  id: string
  tenantId: string
  name: string
  normalizedName: string
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
}

export interface TenantTeamActor {
  tenantId: string
  actorMembershipId: string
  now: Date
}

export abstract class TeamAdministrationRepository {
  abstract listCurrent(input: Omit<TenantTeamActor, 'now'>): Promise<TeamView[]>
  abstract create(input: TenantTeamActor & { name: string; normalizedName: string }): Promise<TeamView>
  abstract update(input: TenantTeamActor & { teamId: string; name: string; normalizedName: string }): Promise<TeamView>
  abstract archive(input: TenantTeamActor & { teamId: string }): Promise<TeamView>
  abstract restore(input: TenantTeamActor & { teamId: string }): Promise<TeamView>
}
