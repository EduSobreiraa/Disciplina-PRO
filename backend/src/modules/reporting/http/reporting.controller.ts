import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { TENANT_PERMISSIONS } from '../../organizations/domain/tenant-permissions.js'
import { CurrentTenant } from '../../organizations/http/current-organization-context.decorators.js'
import { RequireTenantPermissions } from '../../organizations/http/organization-route.decorators.js'
import { GetInactiveMembersReportUseCase, GetPersonalReportUseCase, GetTeamReportUseCase, GetTenantReportUseCase } from '../application/reporting.use-cases.js'
import { InactiveMembersQueryDto } from './reporting.dto.js'
import { InactiveMembersReportResponseDto, PersonalReportResponseDto, TeamReportResponseDto, TenantReportResponseDto } from './reporting-response.dto.js'

@ApiTags('Reporting')
@Controller('reports')
export class ReportingController {
  constructor(
    private readonly getPersonalReport: GetPersonalReportUseCase,
    private readonly getTeamReport: GetTeamReportUseCase,
    private readonly getTenantReport: GetTenantReportUseCase,
    private readonly getInactiveMembersReport: GetInactiveMembersReportUseCase,
  ) {}

  @Get('me')
  @RequireTenantPermissions(TENANT_PERMISSIONS.REPORT_READ_SELF)
  @ApiOperation({ summary: 'Retorna métricas objetivas da membership atual' })
  @ApiOkResponse({ type: PersonalReportResponseDto })
  mine(@CurrentTenant() context: CurrentTenantContext) {
    return this.getPersonalReport.execute(context)
  }

  @Get('teams/:teamId')
  @RequireTenantPermissions(TENANT_PERMISSIONS.REPORT_READ_TEAM)
  @ApiOperation({ summary: 'Retorna métricas objetivas dos membros ativos de um time autorizado' })
  @ApiOkResponse({ type: TeamReportResponseDto })
  async team(
    @CurrentTenant() context: CurrentTenantContext,
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    const report = await this.getTeamReport.execute(context, teamId)
    if (!report) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado' })
    return report
  }

  @Get('tenant')
  @RequireTenantPermissions(TENANT_PERMISSIONS.REPORT_READ_TENANT)
  @ApiOperation({ summary: 'Retorna agregações objetivas do tenant atual' })
  @ApiOkResponse({ type: TenantReportResponseDto })
  tenant(@CurrentTenant() context: CurrentTenantContext) {
    return this.getTenantReport.execute(context)
  }

  @Get('inactive-members')
  @RequireTenantPermissions(TENANT_PERMISSIONS.REPORT_READ_TENANT)
  @ApiOperation({ summary: 'Lista memberships sem fatos objetivos desde o instante informado' })
  @ApiOkResponse({ type: InactiveMembersReportResponseDto })
  inactiveMembers(
    @CurrentTenant() context: CurrentTenantContext,
    @Query() query: InactiveMembersQueryDto,
  ) {
    return this.getInactiveMembersReport.execute(context, new Date(query.inactiveSince))
  }
}
