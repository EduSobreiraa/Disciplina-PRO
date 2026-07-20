import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { CurrentPrincipal } from '../application/authenticated-principal.repository.js'

export interface AuthenticatedRequest extends Request {
  principal?: CurrentPrincipal
}

export const CurrentPrincipalParam = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentPrincipal => {
  const principal = context.switchToHttp().getRequest<AuthenticatedRequest>().principal
  if (!principal) throw new Error('CurrentPrincipal indisponível fora de uma rota autenticada')
  return principal
})
