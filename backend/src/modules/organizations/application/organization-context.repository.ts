export type TenantRole = 'USER' | 'MANAGER' | 'CEO'
export type PlatformRole = 'SUPER_ADMIN'

export interface CurrentTenantContext {
  tenantId: string
  membershipId: string
  userId: string
  tenantRole: TenantRole
}

export interface CurrentPlatformContext {
  platformAccessId: string
  userId: string
  platformRole: PlatformRole
}

export abstract class OrganizationContextRepository {
  abstract resolveTenantContext(input: { userId: string; tenantId: string }): Promise<CurrentTenantContext | null>
  abstract resolvePlatformContext(userId: string): Promise<CurrentPlatformContext | null>
}
