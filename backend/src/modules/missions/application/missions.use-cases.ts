import { Injectable } from '@nestjs/common'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { EMPTY_MISSION_METRICS } from '../domain/mission-metrics.js'
import { MissionsRepository } from './missions.repository.js'
import { MissionsClock } from './missions-clock.js'

@Injectable()
export class GetMyMissionsUseCase {
  constructor(private readonly repository: MissionsRepository, private readonly clock: MissionsClock) {}
  execute(context: CurrentTenantContext) {
    return this.repository.findMine(context, this.clock.now()).then((metrics) => ({ metrics: metrics ?? EMPTY_MISSION_METRICS }))
  }
}
