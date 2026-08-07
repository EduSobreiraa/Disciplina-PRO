import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common'
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { CurrentTenant } from '../../organizations/http/current-organization-context.decorators.js'
import { TenantRoute } from '../../organizations/http/organization-route.decorators.js'
import {
  ArchiveTrackerBehaviorUseCase,
  CreateTrackerBehaviorUseCase,
  DeleteTrackerMarkUseCase,
  ExportTrackerBackupUseCase,
  GetMyTrackerUseCase,
  PutTrackerJustificationUseCase,
  PutTrackerMarkUseCase,
  RenameTrackerBehaviorUseCase,
  RestoreTrackerBackupUseCase,
} from '../application/tracker.use-cases.js'
import {
  InvalidTrackerDataError,
  InvalidTrackerBackupError,
  InvalidTrackerRangeError,
  TrackerBehaviorDuplicateError,
  TrackerBehaviorLimitError,
  TrackerBehaviorNotFoundError,
  TrackerContextNotFoundError,
  TrackerFutureDateError,
  TrackerJustificationNotAllowedError,
  TrackerMarkNotFoundError,
} from '../domain/tracker.errors.js'
import { RestoreTrackerBackupDto, TrackerBackupDto, TrackerBehaviorDto, TrackerBehaviorViewDto, TrackerJustificationDto, TrackerMarkDto, TrackerRangeQueryDto, TrackerStateDto } from './tracker.dto.js'

@ApiTags('Personal tracker')
@TenantRoute()
@Controller('tracker')
export class TrackerController {
  constructor(
    private readonly getMine: GetMyTrackerUseCase,
    private readonly createBehavior: CreateTrackerBehaviorUseCase,
    private readonly renameBehavior: RenameTrackerBehaviorUseCase,
    private readonly archiveBehavior: ArchiveTrackerBehaviorUseCase,
    private readonly putMark: PutTrackerMarkUseCase,
    private readonly deleteMark: DeleteTrackerMarkUseCase,
    private readonly putJustification: PutTrackerJustificationUseCase,
    private readonly exportBackup: ExportTrackerBackupUseCase,
    private readonly restoreBackup: RestoreTrackerBackupUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtém o tracker pessoal no intervalo solicitado' })
  @ApiOkResponse({ type: TrackerStateDto })
  get(@CurrentTenant() context: CurrentTenantContext, @Query() query: TrackerRangeQueryDto) {
    return this.mapErrors(() => this.getMine.execute(context, query.from, query.to))
  }

  @Get('backup')
  @ApiOperation({ summary: 'Exporta todo o tracker pessoal em formato portável' })
  @ApiOkResponse({ type: TrackerBackupDto })
  backup(@CurrentTenant() context: CurrentTenantContext) {
    return this.mapErrors(() => this.exportBackup.execute(context))
  }

  @Put('backup')
  @HttpCode(204)
  @ApiOperation({ summary: 'Substitui atomicamente o tracker pessoal por um backup v2' })
  @ApiNoContentResponse()
  restore(@CurrentTenant() context: CurrentTenantContext, @Body() input: RestoreTrackerBackupDto) {
    return this.mapErrors(() => this.restoreBackup.execute(context, input))
  }

  @Post('behaviors')
  @ApiOperation({ summary: 'Cria um comportamento pessoal' })
  @ApiCreatedResponse({ type: TrackerBehaviorViewDto })
  create(@CurrentTenant() context: CurrentTenantContext, @Body() input: TrackerBehaviorDto) {
    return this.mapErrors(() => this.createBehavior.execute(context, input.name))
  }

  @Patch('behaviors/:behaviorId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Renomeia um comportamento pessoal ativo' })
  @ApiNoContentResponse()
  rename(@CurrentTenant() context: CurrentTenantContext, @Param('behaviorId', ParseUUIDPipe) behaviorId: string, @Body() input: TrackerBehaviorDto) {
    return this.mapErrors(() => this.renameBehavior.execute(context, behaviorId, input.name))
  }

  @Delete('behaviors/:behaviorId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Arquiva um comportamento pessoal' })
  @ApiNoContentResponse()
  archive(@CurrentTenant() context: CurrentTenantContext, @Param('behaviorId', ParseUUIDPipe) behaviorId: string) {
    return this.mapErrors(() => this.archiveBehavior.execute(context, behaviorId))
  }

  @Put('behaviors/:behaviorId/marks/:date')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cria ou substitui uma marca pessoal do dia' })
  @ApiNoContentResponse()
  mark(@CurrentTenant() context: CurrentTenantContext, @Param('behaviorId', ParseUUIDPipe) behaviorId: string, @Param('date') date: string, @Body() input: TrackerMarkDto) {
    return this.mapErrors(() => this.putMark.execute(context, behaviorId, date, input.status))
  }

  @Delete('behaviors/:behaviorId/marks/:date')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove uma marca pessoal do dia' })
  @ApiNoContentResponse()
  unmark(@CurrentTenant() context: CurrentTenantContext, @Param('behaviorId', ParseUUIDPipe) behaviorId: string, @Param('date') date: string) {
    return this.mapErrors(() => this.deleteMark.execute(context, behaviorId, date))
  }

  @Put('behaviors/:behaviorId/marks/:date/justification')
  @HttpCode(204)
  @ApiOperation({ summary: 'Registra a justificativa privada de uma falha' })
  @ApiNoContentResponse()
  justify(@CurrentTenant() context: CurrentTenantContext, @Param('behaviorId', ParseUUIDPipe) behaviorId: string, @Param('date') date: string, @Body() input: TrackerJustificationDto) {
    return this.mapErrors(() => this.putJustification.execute(context, behaviorId, date, input.text))
  }

  private async mapErrors<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof InvalidTrackerRangeError) throw new BadRequestException({ code: 'INVALID_TRACKER_DATE', message: 'Data ou intervalo do tracker inválido' })
      if (error instanceof InvalidTrackerDataError) throw new BadRequestException({ code: 'INVALID_TRACKER_DATA', message: 'Dados do tracker inválidos' })
      if (error instanceof InvalidTrackerBackupError) throw new BadRequestException({ code: 'INVALID_TRACKER_BACKUP', message: 'Backup do tracker inválido ou incompatível' })
      if (error instanceof TrackerFutureDateError) throw new BadRequestException({ code: 'TRACKER_FUTURE_DATE', message: 'Não é permitido registrar data futura' })
      if (error instanceof TrackerBehaviorDuplicateError) throw new ConflictException({ code: 'TRACKER_BEHAVIOR_DUPLICATE', message: 'Comportamento já existe' })
      if (error instanceof TrackerBehaviorLimitError) throw new ConflictException({ code: 'TRACKER_BEHAVIOR_LIMIT', message: 'Limite de comportamentos ativos atingido' })
      if (error instanceof TrackerJustificationNotAllowedError) throw new ConflictException({ code: 'TRACKER_JUSTIFICATION_NOT_ALLOWED', message: 'Justificativa exige uma marca de falha' })
      if (error instanceof TrackerContextNotFoundError || error instanceof TrackerBehaviorNotFoundError || error instanceof TrackerMarkNotFoundError) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado' })
      throw error
    }
  }
}
