import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PlatformRoute } from '../../organizations/http/organization-route.decorators.js'
import { GetInternalEventMetricsUseCase } from '../application/process-internal-events.use-case.js'
import { OutboxOperationsMetricsDto } from './outbox-operations.dto.js'

@ApiTags('Platform operations')
@PlatformRoute()
@Controller('platform/operations/outbox')
export class OutboxOperationsController {
  constructor(private readonly metrics: GetInternalEventMetricsUseCase) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Consulta backlog e falhas da outbox interna' })
  @ApiOkResponse({ type: OutboxOperationsMetricsDto })
  async getMetrics(): Promise<OutboxOperationsMetricsDto> {
    const observedAt = new Date()
    const metrics = await this.metrics.execute(observedAt)
    return {
      ...metrics,
      openDeliveries: metrics.pending + metrics.processing,
      oldestPendingAgeSeconds: metrics.oldestPendingOccurredAt
        ? Math.max(0, Math.floor((observedAt.getTime() - metrics.oldestPendingOccurredAt.getTime()) / 1_000))
        : null,
      observedAt,
    }
  }
}
