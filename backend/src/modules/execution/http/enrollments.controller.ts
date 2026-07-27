import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { CurrentTenant } from '../../organizations/http/current-organization-context.decorators.js'
import { TenantRoute } from '../../organizations/http/organization-route.decorators.js'
import { AbandonEnrollmentUseCase, CompleteEnrollmentUseCase, GetEnrollmentUseCase, ListEnrollmentsUseCase, PauseEnrollmentUseCase, ResumeEnrollmentUseCase, StartEnrollmentUseCase } from '../application/execution.use-cases.js'
import { CompleteActivityUseCase, RecordDailyUseCase } from '../application/execution-facts.use-cases.js'
import { ActivityNotExecutableError, EnrollmentNotCompletableError, EnrollmentNotFoundError, ExecutionBlockedError, InvalidEnrollmentTransitionError, InvalidExecutionDataError, ProgramStartNotAllowedError } from '../domain/execution.errors.js'
import { AbandonEnrollmentDto, DailyRecordDto, PauseEnrollmentDto } from './execution.dto.js'

@ApiTags('Enrollments')
@TenantRoute()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    private readonly listEnrollments: ListEnrollmentsUseCase,
    private readonly getEnrollment: GetEnrollmentUseCase,
    private readonly startEnrollment: StartEnrollmentUseCase,
    private readonly completeEnrollment: CompleteEnrollmentUseCase,
    private readonly abandonEnrollment: AbandonEnrollmentUseCase,
    private readonly pauseEnrollment: PauseEnrollmentUseCase,
    private readonly resumeEnrollment: ResumeEnrollmentUseCase,
    private readonly completeActivity: CompleteActivityUseCase,
    private readonly recordDaily: RecordDailyUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os ciclos da membership atual' })
  list(@CurrentTenant() context: CurrentTenantContext) {
    return this.listEnrollments.execute(context)
  }

  @Put(':enrollmentId/activities/:activityId/completion')
  @ApiOperation({ summary: 'Registra uma ocorrência objetiva de atividade' })
  activityCompletion(
    @CurrentTenant() context: CurrentTenantContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ) {
    return this.mapErrors(() => this.completeActivity.execute(context, enrollmentId, activityId))
  }

  @Put(':enrollmentId/daily-record')
  @ApiOperation({ summary: 'Registra o placar objetivo do dia calculado' })
  dailyRecord(
    @CurrentTenant() context: CurrentTenantContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() input: DailyRecordDto,
  ) {
    return this.mapErrors(() => this.recordDaily.execute(context, enrollmentId, input.scores))
  }

  @Post(':enrollmentId/pause')
  @ApiOperation({ summary: 'Pausa um ciclo por solicitação da pessoa' })
  pause(
    @CurrentTenant() context: CurrentTenantContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() input: PauseEnrollmentDto,
  ) {
    return this.mapErrors(() => this.pauseEnrollment.execute(context, enrollmentId, input.reason))
  }

  @Post(':enrollmentId/resume')
  @ApiOperation({ summary: 'Remove a pausa pessoal e retoma se não houver outros bloqueios' })
  resume(@CurrentTenant() context: CurrentTenantContext, @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string) {
    return this.mapErrors(() => this.resumeEnrollment.execute(context, enrollmentId))
  }

  @Get(':enrollmentId')
  @ApiOperation({ summary: 'Obtém um ciclo e seu dia civil calculado' })
  detail(@CurrentTenant() context: CurrentTenantContext, @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string) {
    return this.mapErrors(() => this.getEnrollment.execute(context, enrollmentId))
  }

  @Post(':enrollmentId/start')
  @ApiOperation({ summary: 'Inicia um ciclo na publicação corrente' })
  start(@CurrentTenant() context: CurrentTenantContext, @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string) {
    return this.mapErrors(() => this.startEnrollment.execute(context, enrollmentId))
  }

  @Post(':enrollmentId/complete')
  @ApiOperation({ summary: 'Conclui um ciclo temporalmente elegível' })
  complete(@CurrentTenant() context: CurrentTenantContext, @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string) {
    return this.mapErrors(() => this.completeEnrollment.execute(context, enrollmentId))
  }

  @Post(':enrollmentId/abandon')
  @ApiOperation({ summary: 'Abandona definitivamente um ciclo' })
  abandon(
    @CurrentTenant() context: CurrentTenantContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() input: AbandonEnrollmentDto,
  ) {
    return this.mapErrors(() => this.abandonEnrollment.execute(context, enrollmentId, input.reason))
  }

  private async mapErrors<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof EnrollmentNotFoundError) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Ciclo não encontrado' })
      if (error instanceof InvalidExecutionDataError) throw new BadRequestException({ code: 'INVALID_EXECUTION_DATA', message: 'Dados de execução inválidos' })
      if (error instanceof ProgramStartNotAllowedError) throw new ConflictException({ code: 'PROGRAM_START_NOT_ALLOWED', message: 'Programa indisponível para início' })
      if (error instanceof EnrollmentNotCompletableError) throw new ConflictException({ code: 'ENROLLMENT_NOT_COMPLETABLE', message: 'Ciclo ainda não pode ser concluído' })
      if (error instanceof ExecutionBlockedError) throw new ConflictException({ code: 'EXECUTION_BLOCKED', message: 'Ciclo permanece bloqueado' })
      if (error instanceof ActivityNotExecutableError) throw new ConflictException({ code: 'ACTIVITY_NOT_EXECUTABLE', message: 'Atividade não executável' })
      if (error instanceof InvalidEnrollmentTransitionError) throw new ConflictException({ code: 'INVALID_ENROLLMENT_TRANSITION', message: 'Transição de ciclo inválida' })
      throw error
    }
  }
}
