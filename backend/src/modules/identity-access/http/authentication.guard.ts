import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { AccessTokenService } from '../application/access-token.js'
import { AuthenticatedPrincipalRepository } from '../application/authenticated-principal.repository.js'
import { Clock } from '../application/clock.js'
import { PUBLIC_ROUTE } from './authentication.constants.js'
import type { AuthenticatedRequest } from './current-principal.decorator.js'

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: AccessTokenService,
    private readonly principals: AuthenticatedPrincipalRepository,
    private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()])
    if (isPublic) return true
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = this.bearerToken(request)
    try {
      const claims = await this.tokens.verify(token)
      const active = await this.principals.isSessionActive({ userId: claims.userId, sessionId: claims.sessionId, now: this.clock.now() })
      if (!active) throw new Error('inactive')
      request.principal = { userId: claims.userId, sessionId: claims.sessionId, tokenId: claims.tokenId }
      return true
    } catch {
      throw new UnauthorizedException({ code: 'AUTHENTICATION_REQUIRED', message: 'Autenticação necessária' })
    }
  }

  private bearerToken(request: Request) {
    const authorization = request.headers.authorization
    if (!authorization) return ''
    const match = /^Bearer ([^\s,]+)$/u.exec(authorization)
    return match?.[1] ?? ''
  }
}
