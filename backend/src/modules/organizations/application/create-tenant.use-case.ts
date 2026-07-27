import { Injectable } from '@nestjs/common'
import type { CurrentPlatformContext } from './organization-context.repository.js'
import { TenantAdministrationRepository } from './tenant-administration.repository.js'
import { normalizeTenantName, validateTenantSlug, validateTenantTimeZone } from '../domain/tenant-policy.js'

@Injectable()
export class CreateTenantUseCase {
  constructor(private readonly tenants: TenantAdministrationRepository) {}
  execute(context: CurrentPlatformContext, input: { name: string; slug: string; timeZone: string }) {
    return this.tenants.create({
      actorPlatformAccessId: context.platformAccessId,
      name: normalizeTenantName(input.name),
      slug: validateTenantSlug(input.slug),
      timeZone: validateTenantTimeZone(input.timeZone),
      now: new Date(),
    })
  }
}
