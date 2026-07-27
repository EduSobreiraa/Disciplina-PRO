import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { TENANT_PERMISSIONS } from '../../organizations/domain/tenant-permissions.js'
import { CurrentTenant } from '../../organizations/http/current-organization-context.decorators.js'
import { RequireTenantPermissions } from '../../organizations/http/organization-route.decorators.js'
import { CreateInvitationUseCase, ListInvitationsUseCase, ResendInvitationUseCase, RevokeInvitationUseCase } from '../application/invitation-administration.use-cases.js'
import { CreateInvitationDto } from './invitation.dto.js'
import { mapInvitationErrors } from './invitation-error.mapper.js'

@ApiTags('Tenant invitations')
@Controller('invitations')
export class TenantInvitationsController {
  constructor(
    private readonly listInvitations: ListInvitationsUseCase,
    private readonly createInvitation: CreateInvitationUseCase,
    private readonly resendInvitation: ResendInvitationUseCase,
    private readonly revokeInvitation: RevokeInvitationUseCase,
  ) {}

  @Get()
  @RequireTenantPermissions(TENANT_PERMISSIONS.INVITATION_READ_SCOPED)
  @ApiOperation({ summary: 'Lista convites visíveis no escopo atual' })
  list(@CurrentTenant() context: CurrentTenantContext) {
    return mapInvitationErrors(() => this.listInvitations.execute(context))
  }

  @Post()
  @RequireTenantPermissions(TENANT_PERMISSIONS.INVITATION_CREATE_SCOPED)
  @ApiOperation({ summary: 'Cria um convite nominal no tenant atual' })
  create(@CurrentTenant() context: CurrentTenantContext, @Body() input: CreateInvitationDto) {
    return mapInvitationErrors(() => this.createInvitation.execute(context, input))
  }

  @Patch(':invitationId/resend')
  @RequireTenantPermissions(TENANT_PERMISSIONS.INVITATION_RESEND_SCOPED)
  @ApiOperation({ summary: 'Gira o token e renova a validade de um convite pendente' })
  resend(@CurrentTenant() context: CurrentTenantContext, @Param('invitationId') invitationId: string) {
    return mapInvitationErrors(() => this.resendInvitation.execute(context, invitationId))
  }

  @Patch(':invitationId/revoke')
  @RequireTenantPermissions(TENANT_PERMISSIONS.INVITATION_REVOKE_SCOPED)
  @ApiOperation({ summary: 'Revoga um convite pendente' })
  revoke(@CurrentTenant() context: CurrentTenantContext, @Param('invitationId') invitationId: string) {
    return mapInvitationErrors(() => this.revokeInvitation.execute(context, invitationId))
  }
}
