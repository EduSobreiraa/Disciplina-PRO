import { Module } from '@nestjs/common'
import { GetMyMissionsUseCase } from './application/missions.use-cases.js'
import { MissionsRepository } from './application/missions.repository.js'
import { MissionsController } from './http/missions.controller.js'
import { PrismaMissionsRepository } from './infrastructure/prisma-missions.repository.js'
import { MissionsClock, SystemMissionsClock } from './application/missions-clock.js'

@Module({
  controllers: [MissionsController],
  providers: [
    PrismaMissionsRepository,
    { provide: MissionsRepository, useExisting: PrismaMissionsRepository },
    { provide: MissionsClock, useClass: SystemMissionsClock },
    GetMyMissionsUseCase,
  ],
})
export class MissionsModule {}
