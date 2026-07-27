import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { CurrentTenant } from '../../organizations/http/current-organization-context.decorators.js'
import { TenantRoute } from '../../organizations/http/organization-route.decorators.js'
import { GetTenantProgramDetailUseCase, ListTenantProgramCatalogUseCase } from '../application/tenant-program-catalog.use-cases.js'
import { ProgramNotFoundError } from '../domain/program.errors.js'

@ApiTags('Tenant programs')
@TenantRoute()
@Controller('programs')
export class TenantProgramsController {
  constructor(
    private readonly listCatalog: ListTenantProgramCatalogUseCase,
    private readonly getDetail: GetTenantProgramDetailUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista o catálogo efetivamente disponível no tenant atual' })
  list(@CurrentTenant() context: CurrentTenantContext) {
    return this.listCatalog.execute(context)
  }

  @Get(':programId')
  @ApiOperation({ summary: 'Obtém a publicação corrente de um programa disponível' })
  async detail(@CurrentTenant() context: CurrentTenantContext, @Param('programId', ParseUUIDPipe) programId: string) {
    try { return await this.getDetail.execute(context, programId) } catch (error) {
      if (error instanceof ProgramNotFoundError) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Programa não encontrado' })
      throw error
    }
  }
}
