import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { CurrentTenant } from '../../organizations/http/current-organization-context.decorators.js'
import { TenantRoute } from '../../organizations/http/organization-route.decorators.js'
import { GetMyGamificationUseCase } from '../application/gamification.use-cases.js'

@ApiTags('Gamification')
@TenantRoute()
@Controller('gamification')
export class GamificationController {
  constructor(private readonly getMine: GetMyGamificationUseCase) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtém XP, nível e conquistas do membro atual' })
  execute(@CurrentTenant() context: CurrentTenantContext) {
    return this.getMine.execute(context)
  }
}
