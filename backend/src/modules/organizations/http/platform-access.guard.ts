import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { OrganizationContextRepository } from '../application/organization-context.repository.js'
import { PUBLIC_ROUTE } from '../../identity-access/http/authentication.constants.js'
import { PLATFORM_ROUTE } from './organization-context.constants.js'
import type { OrganizationRequest } from './current-organization-context.decorators.js'

@Injectable()
export class PlatformAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly contexts: OrganizationContextRepository) {}

  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()]
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets)) return true
    if (!this.reflector.getAllAndOverride<boolean>(PLATFORM_ROUTE, targets)) return true

    const request = context.switchToHttp().getRequest<OrganizationRequest>()
    if (!request.principal) throw new Error('AuthenticationGuard deve executar antes de PlatformAccessGuard')
    const platformContext = await this.contexts.resolvePlatformContext(request.principal.userId)
    if (!platformContext) throw new ForbiddenException({ code: 'PLATFORM_ACCESS_DENIED', message: 'Acesso de plataforma negado' })
    request.platformContext = platformContext
    return true
  }
}
