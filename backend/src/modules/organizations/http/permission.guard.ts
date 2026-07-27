import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { roleHasTenantPermissions, type TenantPermission } from '../domain/tenant-permissions.js'
import { PUBLIC_ROUTE } from '../../identity-access/http/authentication.constants.js'
import { REQUIRED_TENANT_PERMISSIONS } from './organization-context.constants.js'
import type { OrganizationRequest } from './current-organization-context.decorators.js'

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()]
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets)) return true
    const required = this.reflector.getAllAndOverride<TenantPermission[]>(REQUIRED_TENANT_PERMISSIONS, targets)
    if (!required?.length) return true

    const tenant = context.switchToHttp().getRequest<OrganizationRequest>().tenantContext
    if (!tenant) throw new Error('TenantContextGuard deve executar antes de PermissionGuard')
    if (!roleHasTenantPermissions(tenant.tenantRole, required)) {
      throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Permissão insuficiente' })
    }
    return true
  }
}
