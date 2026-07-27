import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { TENANT_PERMISSIONS } from '../../organizations/domain/tenant-permissions.js'
import { CurrentTenant } from '../../organizations/http/current-organization-context.decorators.js'
import { RequireTenantPermissions } from '../../organizations/http/organization-route.decorators.js'
import { GetMyAuditUseCase, GetTeamAuditUseCase, GetTenantAuditUseCase } from '../application/audit.use-cases.js'
import { AuditPageDto } from './audit.dto.js'

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(
    private readonly getMine: GetMyAuditUseCase,
    private readonly getTeam: GetTeamAuditUseCase,
    private readonly getTenant: GetTenantAuditUseCase,
  ) {}

  @Get('me')
  @RequireTenantPermissions(TENANT_PERMISSIONS.AUDIT_READ_SELF)
  @ApiOperation({ summary: 'Lista eventos objetivos ligados à membership atual' })
  mine(@CurrentTenant() context: CurrentTenantContext, @Query() query: AuditPageDto) {
    return this.getMine.execute(context, query)
  }

  @Get('teams/:teamId')
  @RequireTenantPermissions(TENANT_PERMISSIONS.AUDIT_READ_TEAM)
  @ApiOperation({ summary: 'Lista auditoria de um time dentro do escopo gerencial' })
  async team(
    @CurrentTenant() context: CurrentTenantContext,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Query() query: AuditPageDto,
  ) {
    const page = await this.getTeam.execute(context, teamId, query)
    if (!page) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado' })
    return page
  }

  @Get('tenant')
  @RequireTenantPermissions(TENANT_PERMISSIONS.AUDIT_READ_TENANT)
  @ApiOperation({ summary: 'Lista auditoria completa do tenant atual' })
  tenant(@CurrentTenant() context: CurrentTenantContext, @Query() query: AuditPageDto) {
    return this.getTenant.execute(context, query)
  }
}
