import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AssignTeamMembershipUseCase, ChangeMembershipRoleUseCase, EndTeamMembershipUseCase, InactivateMembershipUseCase, ListMembershipsUseCase, ReactivateMembershipUseCase, SuspendMembershipUseCase } from '../application/membership-administration.use-cases.js'
import type { CurrentTenantContext } from '../application/organization-context.repository.js'
import { InvalidMembershipTransitionError, InvalidTeamMembershipAssignmentError, InvalidTenantDataError, MembershipNotFoundError, ResourceScopeDeniedError, TeamMembershipNotFoundError, TeamNotFoundError, TenantActorInactiveError } from '../domain/organization.errors.js'
import { TENANT_PERMISSIONS } from '../domain/tenant-permissions.js'
import { CurrentTenant } from './current-organization-context.decorators.js'
import { MembershipReasonDto, MembershipRoleDto, TeamAssignmentDto } from './membership-administration.dto.js'
import { RequireTenantPermissions } from './organization-route.decorators.js'

@ApiTags('Tenant memberships')
@Controller()
export class TenantMembershipsController {
  constructor(
    private readonly listMemberships: ListMembershipsUseCase,
    private readonly assignTeam: AssignTeamMembershipUseCase,
    private readonly endTeam: EndTeamMembershipUseCase,
    private readonly suspendMembership: SuspendMembershipUseCase,
    private readonly inactivateMembership: InactivateMembershipUseCase,
    private readonly reactivateMembership: ReactivateMembershipUseCase,
    private readonly changeRole: ChangeMembershipRoleUseCase,
  ) {}

  @Get('memberships')
  @RequireTenantPermissions(TENANT_PERMISSIONS.MEMBERSHIP_READ_SCOPED)
  @ApiOperation({ summary: 'Lista memberships visíveis no escopo atual' })
  list(@CurrentTenant() context: CurrentTenantContext) { return this.mapErrors(() => this.listMemberships.execute(context)) }

  @Post('teams/:teamId/memberships')
  @RequireTenantPermissions(TENANT_PERMISSIONS.TEAM_MEMBERS_ASSIGN)
  @ApiOperation({ summary: 'Atribui ou reativa um vínculo de time' })
  assign(@CurrentTenant() context: CurrentTenantContext, @Param('teamId') teamId: string, @Body() input: TeamAssignmentDto) {
    return this.mapErrors(() => this.assignTeam.execute(context, { teamId, membershipId: input.membershipId, role: input.role }))
  }

  @Patch('teams/:teamId/memberships/:membershipId/end')
  @RequireTenantPermissions(TENANT_PERMISSIONS.TEAM_MEMBERS_ASSIGN)
  @ApiOperation({ summary: 'Encerra um vínculo ativo de time' })
  end(@CurrentTenant() context: CurrentTenantContext, @Param('teamId') teamId: string, @Param('membershipId') membershipId: string) {
    return this.mapErrors(() => this.endTeam.execute(context, { teamId, membershipId }))
  }

  @Patch('memberships/:membershipId/suspend')
  @RequireTenantPermissions(TENANT_PERMISSIONS.MEMBERSHIP_SUSPEND)
  suspend(@CurrentTenant() context: CurrentTenantContext, @Param('membershipId') membershipId: string, @Body() input: MembershipReasonDto) {
    return this.mapErrors(() => this.suspendMembership.execute(context, membershipId, input.reason))
  }

  @Patch('memberships/:membershipId/inactivate')
  @RequireTenantPermissions(TENANT_PERMISSIONS.MEMBERSHIP_INACTIVATE_SCOPED)
  inactivate(@CurrentTenant() context: CurrentTenantContext, @Param('membershipId') membershipId: string, @Body() input: MembershipReasonDto) {
    return this.mapErrors(() => this.inactivateMembership.execute(context, membershipId, input.reason))
  }

  @Patch('memberships/:membershipId/reactivate')
  @RequireTenantPermissions(TENANT_PERMISSIONS.MEMBERSHIP_REACTIVATE_SCOPED)
  reactivate(@CurrentTenant() context: CurrentTenantContext, @Param('membershipId') membershipId: string, @Body() input: MembershipReasonDto) {
    return this.mapErrors(() => this.reactivateMembership.execute(context, membershipId, input.reason))
  }

  @Patch('memberships/:membershipId/role')
  @RequireTenantPermissions(TENANT_PERMISSIONS.MEMBERSHIP_CHANGE_ROLE)
  role(@CurrentTenant() context: CurrentTenantContext, @Param('membershipId') membershipId: string, @Body() input: MembershipRoleDto) {
    return this.mapErrors(() => this.changeRole.execute(context, membershipId, input.role))
  }

  private async mapErrors<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof InvalidTenantDataError) throw new BadRequestException({ code: 'INVALID_MEMBERSHIP_DATA', message: error.message })
      if (error instanceof MembershipNotFoundError || error instanceof TeamNotFoundError || error instanceof TeamMembershipNotFoundError) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado' })
      if (error instanceof InvalidMembershipTransitionError) throw new ConflictException({ code: 'INVALID_MEMBERSHIP_TRANSITION', message: 'Transição de membership inválida' })
      if (error instanceof InvalidTeamMembershipAssignmentError) throw new ConflictException({ code: 'INVALID_TEAM_MEMBERSHIP_ASSIGNMENT', message: 'Atribuição de time inválida' })
      if (error instanceof ResourceScopeDeniedError) throw new ForbiddenException({ code: 'RESOURCE_SCOPE_DENIED', message: 'Recurso fora do escopo permitido' })
      if (error instanceof TenantActorInactiveError) throw new ForbiddenException({ code: 'TENANT_ACCESS_DENIED', message: 'Acesso ao tenant negado' })
      throw error
    }
  }
}
