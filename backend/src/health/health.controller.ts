import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { HealthService } from './health.service.js'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Verifica se a API está disponível' })
  getHealth() {
    return this.healthService.getHealth()
  }

  @Get('ready')
  @ApiOperation({ summary: 'Verifica se a API e suas dependências estão disponíveis' })
  getReadiness() {
    return this.healthService.getReadiness()
  }
}
