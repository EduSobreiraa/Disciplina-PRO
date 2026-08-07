export interface TenantView {
  id: string
  name: string
  slug: string
  timeZone: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
  suspendedAt: Date | null
  closedAt: Date | null
}

export interface PlatformTenantView extends TenantView {
  createdAt: Date
  activeCeo: { membershipId: string; email: string } | null
  pendingCeoInvitation: { id: string; email: string; expiresAt: Date } | null
}

export interface PlatformTenantAction {
  tenantId: string
  actorPlatformAccessId: string
  reason: string
  now: Date
}

export abstract class TenantAdministrationRepository {
  abstract list(): Promise<PlatformTenantView[]>
  abstract create(input: {
    actorPlatformAccessId: string
    name: string
    slug: string
    timeZone: string
    now: Date
  }): Promise<TenantView>
  abstract suspend(input: PlatformTenantAction): Promise<TenantView>
  abstract reactivate(input: PlatformTenantAction): Promise<TenantView>
  abstract close(input: PlatformTenantAction): Promise<TenantView>
}
