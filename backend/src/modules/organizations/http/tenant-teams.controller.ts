import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ArchiveTeamUseCase, CreateTeamUseCase, ListTeamsUseCase, RestoreTeamUseCase, UpdateTeamUseCase } from '../application/team-administration.use-cases.js'
import type { CurrentTenantContext } from '../application/organization-context.repository.js'
import { InvalidTeamDataError, InvalidTeamTransitionError, TeamNameUnavailableError, TeamNotFoundError, TenantActorInactiveError } from '../domain/organization.errors.js'
import { TENANT_PERMISSIONS } from '../domain/tenant-permissions.js'
import { CurrentTenant } from './current-organization-context.decorators.js'
import { RequireTenantPermissions } from './organization-route.decorators.js'
import { TeamNameDto } from './team-administration.dto.js'

@ApiTags('Tenant teams')
@Controller('teams')
export class TenantTeamsController {
  constructor(
    private readonly listTeams: ListTeamsUseCase,
    private readonly createTeam: CreateTeamUseCase,
    private readonly updateTeam: UpdateTeamUseCase,
    private readonly archiveTeam: ArchiveTeamUseCase,
    private readonly restoreTeam: RestoreTeamUseCase,
  ) {}

  @Get()
  @RequireTenantPermissions(TENANT_PERMISSIONS.TEAM_READ_ALL)
  @ApiOperation({ summary: 'Lista times ativos do tenant atual' })
  list(@CurrentTenant() context: CurrentTenantContext) { return this.mapErrors(() => this.listTeams.execute(context)) }

  @Post()
  @RequireTenantPermissions(TENANT_PERMISSIONS.TEAM_CREATE)
  @ApiOperation({ summary: 'Cria um time no tenant atual' })
  create(@CurrentTenant() context: CurrentTenantContext, @Body() input: TeamNameDto) { return this.mapErrors(() => this.createTeam.execute(context, input)) }

  @Patch(':teamId')
  @RequireTenantPermissions(TENANT_PERMISSIONS.TEAM_UPDATE)
  @ApiOperation({ summary: 'Renomeia um time ativo' })
  update(@CurrentTenant() context: CurrentTenantContext, @Param('teamId') teamId: string, @Body() input: TeamNameDto) { return this.mapErrors(() => this.updateTeam.execute(context, { teamId, name: input.name })) }

  @Patch(':teamId/archive')
  @RequireTenantPermissions(TENANT_PERMISSIONS.TEAM_ARCHIVE)
  @ApiOperation({ summary: 'Arquiva um time e encerra seus vínculos ativos' })
  archive(@CurrentTenant() context: CurrentTenantContext, @Param('teamId') teamId: string) { return this.mapErrors(() => this.archiveTeam.execute(context, teamId)) }

  @Patch(':teamId/restore')
  @RequireTenantPermissions(TENANT_PERMISSIONS.TEAM_RESTORE)
  @ApiOperation({ summary: 'Restaura um time arquivado se o nome estiver disponível' })
  restore(@CurrentTenant() context: CurrentTenantContext, @Param('teamId') teamId: string) { return this.mapErrors(() => this.restoreTeam.execute(context, teamId)) }

  private async mapErrors<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof InvalidTeamDataError) throw new BadRequestException({ code: 'INVALID_TEAM_DATA', message: error.message })
      if (error instanceof TeamNameUnavailableError) throw new ConflictException({ code: 'TEAM_NAME_UNAVAILABLE', message: 'Nome do time indisponível' })
      if (error instanceof TeamNotFoundError) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado' })
      if (error instanceof InvalidTeamTransitionError) throw new ConflictException({ code: 'INVALID_TEAM_TRANSITION', message: 'Transição de time inválida' })
      if (error instanceof TenantActorInactiveError) throw new ForbiddenException({ code: 'TENANT_ACCESS_DENIED', message: 'Acesso ao tenant negado' })
      throw error
    }
  }
}
