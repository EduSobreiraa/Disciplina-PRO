import { applyDecorators, SetMetadata } from '@nestjs/common'
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger'
import type { TenantPermission } from '../domain/tenant-permissions.js'
import { PLATFORM_ROUTE, REQUIRED_TENANT_PERMISSIONS, TENANT_ROUTE } from './organization-context.constants.js'

export function TenantRoute() {
  return applyDecorators(
    SetMetadata(TENANT_ROUTE, true),
    SetMetadata(PLATFORM_ROUTE, false),
    ApiBearerAuth('access-token'),
    ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'UUID do tenant selecionado' }),
  )
}

export function PlatformRoute() {
  return applyDecorators(SetMetadata(PLATFORM_ROUTE, true), SetMetadata(TENANT_ROUTE, false), ApiBearerAuth('access-token'))
}

export function RequireTenantPermissions(...permissions: TenantPermission[]) {
  return applyDecorators(TenantRoute(), SetMetadata(REQUIRED_TENANT_PERMISSIONS, permissions))
}
