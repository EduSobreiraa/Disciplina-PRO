import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { OrganizationContextRepository } from '../application/organization-context.repository.js'
import { PUBLIC_ROUTE } from '../../identity-access/http/authentication.constants.js'
import { TENANT_ROUTE } from './organization-context.constants.js'
import type { OrganizationRequest } from './current-organization-context.decorators.js'
import { parseTenantHeader } from './tenant-header.js'

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly contexts: OrganizationContextRepository) {}

  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()]
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets)) return true
    if (!this.reflector.getAllAndOverride<boolean>(TENANT_ROUTE, targets)) return true

    const request = context.switchToHttp().getRequest<OrganizationRequest>()
    if (!request.principal) throw new Error('AuthenticationGuard deve executar antes de TenantContextGuard')
    const tenantId = parseTenantHeader(request.headers['x-tenant-id'], true)
    if (!tenantId) throw new Error('Tenant header obrigatório não foi resolvido')
    const tenantContext = await this.contexts.resolveTenantContext({ userId: request.principal.userId, tenantId })
    if (!tenantContext) throw new ForbiddenException({ code: 'TENANT_ACCESS_DENIED', message: 'Acesso ao tenant negado' })
    request.tenantContext = tenantContext
    return true
  }
}
