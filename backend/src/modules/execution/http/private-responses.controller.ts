import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Put } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { CurrentTenant } from '../../organizations/http/current-organization-context.decorators.js'
import { TenantRoute } from '../../organizations/http/organization-route.decorators.js'
import { GetPrivateResponseUseCase, PutPrivateResponseUseCase } from '../application/execution-facts.use-cases.js'
import { ActivityNotExecutableError, EnrollmentNotFoundError, ExecutionBlockedError, InvalidExecutionDataError, PrivateResponseNotFoundError } from '../domain/execution.errors.js'
import { PrivateResponseDto } from './execution.dto.js'

@ApiTags('Private execution responses')
@TenantRoute()
@Controller('enrollments/:enrollmentId/private-responses')
export class PrivateResponsesController {
  constructor(
    private readonly putResponse: PutPrivateResponseUseCase,
    private readonly getResponse: GetPrivateResponseUseCase,
  ) {}

  @Put(':activityId')
  @ApiOperation({ summary: 'Cria ou substitui uma resposta privada do dia atual' })
  put(
    @CurrentTenant() context: CurrentTenantContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() input: PrivateResponseDto,
  ) {
    return this.mapErrors(() => this.putResponse.execute(context, enrollmentId, activityId, input.payload))
  }

  @Get(':activityId')
  @ApiOperation({ summary: 'Obtém uma resposta privada do dia atual' })
  get(
    @CurrentTenant() context: CurrentTenantContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ) {
    return this.mapErrors(() => this.getResponse.execute(context, enrollmentId, activityId))
  }

  private async mapErrors<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof EnrollmentNotFoundError || error instanceof PrivateResponseNotFoundError) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado' })
      if (error instanceof InvalidExecutionDataError) throw new BadRequestException({ code: 'INVALID_EXECUTION_DATA', message: 'Resposta privada inválida' })
      if (error instanceof ExecutionBlockedError) throw new ConflictException({ code: 'EXECUTION_BLOCKED', message: 'Ciclo permanece bloqueado' })
      if (error instanceof ActivityNotExecutableError) throw new ConflictException({ code: 'ACTIVITY_NOT_EXECUTABLE', message: 'Atividade não aceita resposta privada' })
      throw error
    }
  }
}
