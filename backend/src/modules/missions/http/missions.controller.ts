import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { CurrentTenant } from '../../organizations/http/current-organization-context.decorators.js'
import { TenantRoute } from '../../organizations/http/organization-route.decorators.js'
import { GetMyMissionsUseCase } from '../application/missions.use-cases.js'
import { MissionsViewDto } from './missions.dto.js'

@ApiTags('Missions')
@TenantRoute()
@Controller('missions')
export class MissionsController {
  constructor(private readonly getMine: GetMyMissionsUseCase) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtém as métricas derivadas das missões do membro atual' })
  @ApiOkResponse({ type: MissionsViewDto })
  execute(@CurrentTenant() context: CurrentTenantContext) {
    return this.getMine.execute(context)
  }
}
