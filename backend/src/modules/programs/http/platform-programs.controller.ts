import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentPlatformContext } from '../../organizations/application/organization-context.repository.js'
import { CurrentPlatform } from '../../organizations/http/current-organization-context.decorators.js'
import { PlatformRoute } from '../../organizations/http/organization-route.decorators.js'
import { ArchiveProgramUseCase, CreateProgramUseCase, CreateProgramVersionUseCase, PublishProgramVersionUseCase, ReplaceProgramDraftUseCase, UpdateProgramUseCase } from '../application/program-administration.use-cases.js'
import { InvalidProgramDataError, InvalidProgramTransitionError, PlatformProgramActorInactiveError, ProgramDraftAlreadyExistsError, ProgramEnablementNotAllowedError, ProgramNotFoundError, ProgramSlugAlreadyExistsError, ProgramVersionNotPublishableError } from '../domain/program.errors.js'
import { CreateProgramDto, ProgramIdentityDto, ProgramVersionDto } from './program-administration.dto.js'
import { DisableTenantProgramUseCase, EnableTenantProgramUseCase } from '../application/tenant-program-administration.use-cases.js'

@ApiTags('Platform programs')
@PlatformRoute()
@Controller('platform')
export class PlatformProgramsController {
  constructor(
    private readonly createProgram: CreateProgramUseCase,
    private readonly updateProgram: UpdateProgramUseCase,
    private readonly replaceDraft: ReplaceProgramDraftUseCase,
    private readonly createVersion: CreateProgramVersionUseCase,
    private readonly publishVersion: PublishProgramVersionUseCase,
    private readonly archiveProgram: ArchiveProgramUseCase,
    private readonly enableTenantProgram: EnableTenantProgramUseCase,
    private readonly disableTenantProgram: DisableTenantProgramUseCase,
  ) {}

  @Post('programs')
  @ApiOperation({ summary: 'Cria programa global com primeiro draft' })
  create(@CurrentPlatform() context: CurrentPlatformContext, @Body() input: CreateProgramDto) {
    return this.mapErrors(() => this.createProgram.execute(context, input))
  }

  @Patch('programs/:programId')
  @ApiOperation({ summary: 'Atualiza a identidade de um programa ativo' })
  update(@CurrentPlatform() context: CurrentPlatformContext, @Param('programId', ParseUUIDPipe) programId: string, @Body() input: ProgramIdentityDto) {
    return this.mapErrors(() => this.updateProgram.execute(context, programId, input))
  }

  @Post('programs/:programId/versions')
  @ApiOperation({ summary: 'Copia a publicação corrente para um novo draft' })
  version(@CurrentPlatform() context: CurrentPlatformContext, @Param('programId', ParseUUIDPipe) programId: string) {
    return this.mapErrors(() => this.createVersion.execute(context, programId))
  }

  @Post('programs/:programId/archive')
  @ApiOperation({ summary: 'Arquiva definitivamente um programa global' })
  archive(@CurrentPlatform() context: CurrentPlatformContext, @Param('programId', ParseUUIDPipe) programId: string) {
    return this.mapErrors(() => this.archiveProgram.execute(context, programId))
  }

  @Put('program-versions/:versionId')
  @ApiOperation({ summary: 'Substitui integralmente uma árvore draft' })
  draft(@CurrentPlatform() context: CurrentPlatformContext, @Param('versionId', ParseUUIDPipe) versionId: string, @Body() input: ProgramVersionDto) {
    return this.mapErrors(() => this.replaceDraft.execute(context, versionId, input))
  }

  @Post('program-versions/:versionId/publish')
  @ApiOperation({ summary: 'Publica atomicamente uma versão válida' })
  publish(@CurrentPlatform() context: CurrentPlatformContext, @Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.mapErrors(() => this.publishVersion.execute(context, versionId))
  }

  @Put('tenants/:tenantId/programs/:programId/enable')
  @ApiOperation({ summary: 'Habilita um programa e provisiona memberships ativas' })
  enable(@CurrentPlatform() context: CurrentPlatformContext, @Param('tenantId', ParseUUIDPipe) tenantId: string, @Param('programId', ParseUUIDPipe) programId: string) {
    return this.mapErrors(() => this.enableTenantProgram.execute(context, tenantId, programId))
  }

  @Put('tenants/:tenantId/programs/:programId/disable')
  @ApiOperation({ summary: 'Desabilita um programa sem apagar enrollments' })
  disable(@CurrentPlatform() context: CurrentPlatformContext, @Param('tenantId', ParseUUIDPipe) tenantId: string, @Param('programId', ParseUUIDPipe) programId: string) {
    return this.mapErrors(() => this.disableTenantProgram.execute(context, tenantId, programId))
  }

  private async mapErrors<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof InvalidProgramDataError) throw new BadRequestException({ code: 'INVALID_PROGRAM_DATA', message: error.message })
      if (error instanceof ProgramNotFoundError) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Programa ou versão não encontrado' })
      if (error instanceof ProgramSlugAlreadyExistsError) throw new ConflictException({ code: 'PROGRAM_SLUG_ALREADY_EXISTS', message: 'Slug de programa já utilizado' })
      if (error instanceof ProgramDraftAlreadyExistsError) throw new ConflictException({ code: 'PROGRAM_DRAFT_ALREADY_EXISTS', message: 'O programa já possui um draft' })
      if (error instanceof ProgramVersionNotPublishableError) throw new ConflictException({ code: 'PROGRAM_VERSION_NOT_PUBLISHABLE', message: 'A versão não pode ser publicada' })
      if (error instanceof InvalidProgramTransitionError) throw new ConflictException({ code: 'INVALID_PROGRAM_TRANSITION', message: 'Transição de programa inválida' })
      if (error instanceof ProgramEnablementNotAllowedError) throw new ConflictException({ code: 'PROGRAM_ENABLEMENT_NOT_ALLOWED', message: 'Programa não pode ser habilitado ou desabilitado' })
      if (error instanceof PlatformProgramActorInactiveError) throw new ForbiddenException({ code: 'PLATFORM_ACCESS_DENIED', message: 'Acesso de plataforma negado' })
      throw error
    }
  }
}
