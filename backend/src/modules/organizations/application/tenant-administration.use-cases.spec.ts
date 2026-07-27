import { jest } from '@jest/globals'
import { CloseTenantUseCase } from './close-tenant.use-case.js'
import { CreateTenantUseCase } from './create-tenant.use-case.js'
import type { CurrentPlatformContext } from './organization-context.repository.js'
import { ReactivateTenantUseCase } from './reactivate-tenant.use-case.js'
import { SuspendTenantUseCase } from './suspend-tenant.use-case.js'
import type { PlatformTenantAction, TenantAdministrationRepository, TenantView } from './tenant-administration.repository.js'

const context: CurrentPlatformContext = {
  platformAccessId: '019f854f-58c7-7d1c-85ec-b855ee159027',
  userId: '019f854f-58c7-7d1c-85ec-b855ee159028',
  platformRole: 'SUPER_ADMIN',
}

const tenant: TenantView = {
  id: '019f854f-58c7-7d1c-85ec-b855ee159029',
  name: 'Tenant Exemplo',
  slug: 'tenant-exemplo',
  timeZone: 'America/Bahia',
  status: 'PENDING',
  suspendedAt: null,
  closedAt: null,
}

describe('casos de uso de administração de tenants', () => {
  const create = jest.fn<TenantAdministrationRepository['create']>().mockResolvedValue(tenant)
  const suspend = jest.fn<TenantAdministrationRepository['suspend']>().mockResolvedValue(tenant)
  const reactivate = jest.fn<TenantAdministrationRepository['reactivate']>().mockResolvedValue(tenant)
  const close = jest.fn<TenantAdministrationRepository['close']>().mockResolvedValue(tenant)
  const repository = {
    create,
    suspend,
    reactivate,
    close,
  } as jest.Mocked<TenantAdministrationRepository>

  beforeEach(() => jest.clearAllMocks())

  it('normaliza e encaminha a criação ao repositório', async () => {
    await new CreateTenantUseCase(repository).execute(context, {
      name: '  Tenant   Exemplo  ',
      slug: 'tenant-exemplo',
      timeZone: 'America/Bahia',
    })

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      actorPlatformAccessId: context.platformAccessId,
      name: 'Tenant Exemplo',
      slug: 'tenant-exemplo',
      timeZone: 'America/Bahia',
      now: expect.any(Date) as Date,
    }))
  })

  it.each([
    ['suspensão', SuspendTenantUseCase, 'suspend'],
    ['reativação', ReactivateTenantUseCase, 'reactivate'],
    ['encerramento', CloseTenantUseCase, 'close'],
  ] as const)('valida e encaminha a %s ao repositório', async (_name, UseCase, method) => {
    await new UseCase(repository).execute(context, {
      tenantId: tenant.id,
      reason: '  Motivo   operacional  ',
    })

    const operation = { suspend, reactivate, close }[method]
    expect(operation).toHaveBeenCalledWith({
      tenantId: tenant.id,
      actorPlatformAccessId: context.platformAccessId,
      reason: 'Motivo operacional',
      now: expect.any(Date) as Date,
    } satisfies PlatformTenantAction)
  })
})
