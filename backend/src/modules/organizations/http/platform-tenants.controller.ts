import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { CloseTenantUseCase } from '../application/close-tenant.use-case.js'
import { CreateTenantUseCase } from '../application/create-tenant.use-case.js'
import { ReactivateTenantUseCase } from '../application/reactivate-tenant.use-case.js'
import { SuspendTenantUseCase } from '../application/suspend-tenant.use-case.js'
import { InvalidTenantDataError, InvalidTenantTransitionError, PlatformActorInactiveError, TenantActiveCeoRequiredError, TenantNotFoundError, TenantSlugUnavailableError } from '../domain/organization.errors.js'
import type { CurrentPlatformContext } from '../application/organization-context.repository.js'
import { CurrentPlatform } from './current-organization-context.decorators.js'
import { PlatformRoute } from './organization-route.decorators.js'
import { CreateTenantDto, TenantReasonDto } from './tenant-administration.dto.js'
import { ReplaceCeoUseCase } from '../application/membership-administration.use-cases.js'
import { ReplaceCeoDto } from './membership-administration.dto.js'
import { InvalidCeoReplacementError } from '../domain/organization.errors.js'
import { ListPlatformTenantsUseCase } from '../application/list-platform-tenants.use-case.js'

@ApiTags('Platform tenants')
@PlatformRoute()
@Controller('platform/tenants')
export class PlatformTenantsController {
  constructor(private readonly listTenants: ListPlatformTenantsUseCase, private readonly createTenant: CreateTenantUseCase, private readonly suspendTenant: SuspendTenantUseCase, private readonly reactivateTenant: ReactivateTenantUseCase, private readonly closeTenant: CloseTenantUseCase, private readonly replaceCeo: ReplaceCeoUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Lista tenants para administração de plataforma' })
  list(@CurrentPlatform() context: CurrentPlatformContext) {
    return this.listTenants.execute(context)
  }

  @Post()
  @ApiOperation({ summary: 'Cria um tenant pendente' })
  create(@CurrentPlatform() context: CurrentPlatformContext, @Body() input: CreateTenantDto) {
    return this.mapErrors(() => this.createTenant.execute(context, input))
  }

  @Patch(':tenantId/suspend')
  @ApiOperation({ summary: 'Suspende um tenant ativo' })
  suspend(@CurrentPlatform() context: CurrentPlatformContext, @Param('tenantId') tenantId: string, @Body() input: TenantReasonDto) {
    return this.mapErrors(() => this.suspendTenant.execute(context, { tenantId, reason: input.reason }))
  }

  @Patch(':tenantId/reactivate')
  @ApiOperation({ summary: 'Reativa um tenant suspenso com CEO ativo' })
  reactivate(@CurrentPlatform() context: CurrentPlatformContext, @Param('tenantId') tenantId: string, @Body() input: TenantReasonDto) {
    return this.mapErrors(() => this.reactivateTenant.execute(context, { tenantId, reason: input.reason }))
  }

  @Patch(':tenantId/close')
  @ApiOperation({ summary: 'Encerra definitivamente um tenant' })
  close(@CurrentPlatform() context: CurrentPlatformContext, @Param('tenantId') tenantId: string, @Body() input: TenantReasonDto) {
    return this.mapErrors(() => this.closeTenant.execute(context, { tenantId, reason: input.reason }))
  }

  @Patch(':tenantId/ceo')
  @ApiOperation({ summary: 'Substitui atomicamente o CEO por uma membership elegível' })
  ceo(@CurrentPlatform() context: CurrentPlatformContext, @Param('tenantId') tenantId: string, @Body() input: ReplaceCeoDto) {
    return this.mapErrors(() => this.replaceCeo.execute(context, { tenantId, expectedCeoMembershipId: input.expectedCeoMembershipId, successorMembershipId: input.successorMembershipId, reason: input.reason }))
  }

  private async mapErrors<T>(operation: () => Promise<T>) {
    try { return await operation() } catch (error) {
      if (error instanceof InvalidTenantDataError) throw new BadRequestException({ code: 'INVALID_TENANT_DATA', message: error.message })
      if (error instanceof TenantSlugUnavailableError) throw new ConflictException({ code: 'TENANT_SLUG_UNAVAILABLE', message: 'Slug do tenant indisponível' })
      if (error instanceof TenantNotFoundError) throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'Tenant não encontrado' })
      if (error instanceof InvalidTenantTransitionError) throw new ConflictException({ code: 'INVALID_TENANT_TRANSITION', message: 'Transição de tenant inválida' })
      if (error instanceof TenantActiveCeoRequiredError) throw new ConflictException({ code: 'TENANT_ACTIVE_CEO_REQUIRED', message: 'Tenant precisa possuir exatamente um CEO ativo' })
      if (error instanceof PlatformActorInactiveError) throw new ForbiddenException({ code: 'PLATFORM_ACCESS_DENIED', message: 'Acesso de plataforma negado' })
      if (error instanceof InvalidCeoReplacementError) throw new ConflictException({ code: 'INVALID_CEO_REPLACEMENT', message: 'Substituição de CEO inválida' })
      throw error
    }
  }
}
