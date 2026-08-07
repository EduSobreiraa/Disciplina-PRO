import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import type { MissionMetrics } from '../domain/mission-metrics.js'

export abstract class MissionsRepository {
  abstract findMine(context: CurrentTenantContext, now: Date): Promise<MissionMetrics | null>
}
