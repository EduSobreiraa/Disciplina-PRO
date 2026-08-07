import { Injectable } from '@nestjs/common'
import type { CurrentPlatformContext } from './organization-context.repository.js'
import { TenantAdministrationRepository } from './tenant-administration.repository.js'

@Injectable()
export class ListPlatformTenantsUseCase {
  constructor(private readonly tenants: TenantAdministrationRepository) {}

  execute(context: CurrentPlatformContext) {
    void context
    return this.tenants.list()
  }
}
