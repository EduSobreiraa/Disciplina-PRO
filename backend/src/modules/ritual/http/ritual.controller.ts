import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { CurrentTenant } from '../../organizations/http/current-organization-context.decorators.js'
import { TenantRoute } from '../../organizations/http/organization-route.decorators.js'
import { ChangeRitualTimerUseCase, GetMyRitualUseCase, SetRitualCheckUseCase } from '../application/ritual.use-cases.js'
import {
  InvalidRitualDateError,
  InvalidRitualItemError,
  RitualContextNotFoundError,
  RitualFutureDateError,
  RitualTimerDateError,
} from '../domain/ritual.errors.js'
import { RitualCheckCommandDto, RitualDayViewDto, RitualRangeQueryDto, RitualStateDto } from './ritual.dto.js'

@ApiTags('Daily ritual')
@TenantRoute()
@Controller('ritual')
export class RitualController {
  constructor(
    private readonly getMine: GetMyRitualUseCase,
    private readonly setCheck: SetRitualCheckUseCase,
    private readonly changeTimer: ChangeRitualTimerUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtém os fatos pessoais do ritual no intervalo solicitado' })
  @ApiOkResponse({ type: RitualStateDto })
  get(@CurrentTenant() context: CurrentTenantContext, @Query() query: RitualRangeQueryDto) {
    return this.mapErrors(() => this.getMine.execute(context, query.from, query.to))
  }

  @Put('me/:date/checks/:sectionKey/:itemKey')
  @ApiOperation({ summary: 'Define idempotentemente um check pessoal do ritual' })
  @ApiOkResponse({ type: RitualDayViewDto })
  check(
    @CurrentTenant() context: CurrentTenantContext,
    @Param('date') date: string,
    @Param('sectionKey') sectionKey: string,
    @Param('itemKey') itemKey: string,
    @Body() input: RitualCheckCommandDto,
  ) {
    return this.mapErrors(() => this.setCheck.execute(context, date, sectionKey, itemKey, input.completed))
  }

  @Post('me/:date/timer/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia ou mantém idempotentemente o ciclo atual' })
  @ApiOkResponse({ type: RitualDayViewDto })
  start(@CurrentTenant() context: CurrentTenantContext, @Param('date') date: string) {
    return this.mapErrors(() => this.changeTimer.execute(context, date, 'start'))
  }

  @Post('me/:date/timer/pause')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pausa idempotentemente o ciclo atual' })
  @ApiOkResponse({ type: RitualDayViewDto })
  pause(@CurrentTenant() context: CurrentTenantContext, @Param('date') date: string) {
    return this.mapErrors(() => this.changeTimer.execute(context, date, 'pause'))
  }

  @Post('me/:date/timer/reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reinicia os oito ciclos do dia atual' })
  @ApiOkResponse({ type: RitualDayViewDto })
  reset(@CurrentTenant() context: CurrentTenantContext, @Param('date') date: string) {
    return this.mapErrors(() => this.changeTimer.execute(context, date, 'reset'))
  }

  private async mapErrors<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof InvalidRitualDateError) throw new BadRequestException({ code: 'INVALID_RITUAL_DATE', message: 'Data ou intervalo do ritual inválido' })
      if (error instanceof InvalidRitualItemError) throw new BadRequestException({ code: 'INVALID_RITUAL_ITEM', message: 'Etapa do ritual inválida' })
      if (error instanceof RitualFutureDateError) throw new BadRequestException({ code: 'RITUAL_FUTURE_DATE', message: 'Não é permitido registrar data futura' })
      if (error instanceof RitualTimerDateError) throw new ConflictException({ code: 'RITUAL_TIMER_DATE', message: 'O timer só pode ser operado na data atual da organização' })
      if (error instanceof RitualContextNotFoundError) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado' })
      throw error
    }
  }
}
