import { Body, Controller, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentPrincipal } from '../../identity-access/application/authenticated-principal.repository.js'
import { CurrentPrincipalParam } from '../../identity-access/http/current-principal.decorator.js'
import { Public } from '../../identity-access/http/public.decorator.js'
import { AcceptInvitationForExistingIdentityUseCase, AcceptInvitationForNewIdentityUseCase } from '../application/invitation-acceptance.use-cases.js'
import { AcceptExistingIdentityInvitationDto, AcceptNewIdentityInvitationDto } from './invitation-acceptance.dto.js'
import { mapInvitationErrors } from './invitation-error.mapper.js'

@ApiTags('Invitation acceptance')
@Controller('invitations/accept')
export class InvitationAcceptanceController {
  constructor(
    private readonly acceptNewIdentity: AcceptInvitationForNewIdentityUseCase,
    private readonly acceptExistingIdentity: AcceptInvitationForExistingIdentityUseCase,
  ) {}

  @Public()
  @Post('new-identity')
  @ApiOperation({ summary: 'Aceita convite criando uma nova identidade' })
  acceptNew(@Body() input: AcceptNewIdentityInvitationDto) {
    return mapInvitationErrors(() => this.acceptNewIdentity.execute(input))
  }

  @Post('existing-identity')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Aceita convite usando a identidade autenticada' })
  acceptExisting(@CurrentPrincipalParam() principal: CurrentPrincipal, @Body() input: AcceptExistingIdentityInvitationDto) {
    return mapInvitationErrors(() => this.acceptExistingIdentity.execute(principal, input.token))
  }
}
