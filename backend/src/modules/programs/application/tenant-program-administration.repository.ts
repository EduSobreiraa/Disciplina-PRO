export interface TenantProgramView {
  id: string
  tenantId: string
  programId: string
  status: 'ENABLED' | 'DISABLED'
  enabledAt: Date
  disabledAt: Date | null
  provisionedEnrollments: number
}

export abstract class TenantProgramAdministrationRepository {
  abstract enable(input: { actorPlatformAccessId: string; tenantId: string; programId: string; now: Date }): Promise<TenantProgramView>
  abstract disable(input: { actorPlatformAccessId: string; tenantId: string; programId: string; now: Date }): Promise<TenantProgramView>
}
