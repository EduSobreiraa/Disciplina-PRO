import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AuthenticatedRequest } from '../../identity-access/http/current-principal.decorator.js'
import type { CurrentPlatformContext, CurrentTenantContext } from '../application/organization-context.repository.js'

export interface OrganizationRequest extends AuthenticatedRequest {
  tenantContext?: CurrentTenantContext
  platformContext?: CurrentPlatformContext
}

export const CurrentTenant = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentTenantContext => {
  const tenant = context.switchToHttp().getRequest<OrganizationRequest>().tenantContext
  if (!tenant) throw new Error('CurrentTenantContext indisponível fora de uma rota de tenant')
  return tenant
})

export const CurrentPlatform = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentPlatformContext => {
  const platform = context.switchToHttp().getRequest<OrganizationRequest>().platformContext
  if (!platform) throw new Error('CurrentPlatformContext indisponível fora de uma rota de plataforma')
  return platform
})
