import { Injectable } from '@nestjs/common'
import type { CurrentPlatformContext } from '../../organizations/application/organization-context.repository.js'
import { TenantProgramAdministrationRepository } from './tenant-program-administration.repository.js'

@Injectable()
export class EnableTenantProgramUseCase {
  constructor(private readonly programs: TenantProgramAdministrationRepository) {}
  execute(context: CurrentPlatformContext, tenantId: string, programId: string) {
    return this.programs.enable({ actorPlatformAccessId: context.platformAccessId, tenantId, programId, now: new Date() })
  }
}

@Injectable()
export class DisableTenantProgramUseCase {
  constructor(private readonly programs: TenantProgramAdministrationRepository) {}
  execute(context: CurrentPlatformContext, tenantId: string, programId: string) {
    return this.programs.disable({ actorPlatformAccessId: context.platformAccessId, tenantId, programId, now: new Date() })
  }
}
