import { Body, Controller, Param, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentPlatformContext } from '../../organizations/application/organization-context.repository.js'
import { CurrentPlatform } from '../../organizations/http/current-organization-context.decorators.js'
import { PlatformRoute } from '../../organizations/http/organization-route.decorators.js'
import { CreateFirstCeoInvitationUseCase } from '../application/invitation-administration.use-cases.js'
import { CreateFirstCeoInvitationDto } from './invitation.dto.js'
import { mapInvitationErrors } from './invitation-error.mapper.js'

@ApiTags('Platform invitations')
@PlatformRoute()
@Controller('platform/tenants/:tenantId/invitations')
export class PlatformInvitationsController {
  constructor(private readonly createFirstCeo: CreateFirstCeoInvitationUseCase) {}

  @Post('ceo')
  @ApiOperation({ summary: 'Convida o primeiro CEO de um tenant pendente' })
  create(@CurrentPlatform() context: CurrentPlatformContext, @Param('tenantId') tenantId: string, @Body() input: CreateFirstCeoInvitationDto) {
    return mapInvitationErrors(() => this.createFirstCeo.execute(context, tenantId, input))
  }
}
