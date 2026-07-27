import { Injectable } from '@nestjs/common'
import type { CurrentPlatformContext } from './organization-context.repository.js'
import { TenantAdministrationRepository } from './tenant-administration.repository.js'
import { normalizeOperationalReason, validateOrganizationId } from '../domain/tenant-policy.js'

@Injectable()
export class CloseTenantUseCase {
  constructor(private readonly tenants: TenantAdministrationRepository) {}
  execute(context: CurrentPlatformContext, input: { tenantId: string; reason: string }) {
    return this.tenants.close({ tenantId: validateOrganizationId(input.tenantId), actorPlatformAccessId: context.platformAccessId, reason: normalizeOperationalReason(input.reason), now: new Date() })
  }
}
