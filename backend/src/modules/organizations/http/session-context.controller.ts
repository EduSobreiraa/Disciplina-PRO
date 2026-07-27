import { Controller, Get, NotFoundException } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentPrincipal } from '../../identity-access/application/authenticated-principal.repository.js'
import { CurrentPrincipalParam } from '../../identity-access/http/current-principal.decorator.js'
import { GetSessionContextUseCase } from '../application/get-session-context.use-case.js'

@ApiTags('Current session')
@Controller('session')
export class SessionContextController {
  constructor(private readonly getSessionContext: GetSessionContextUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Obtém identidade e organizações ativas da sessão atual' })
  async get(@CurrentPrincipalParam() principal: CurrentPrincipal) {
    const context = await this.getSessionContext.execute(principal.userId)
    if (!context) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Sessão não encontrada' })
    return context
  }
}
