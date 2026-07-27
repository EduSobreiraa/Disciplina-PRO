import { Module } from '@nestjs/common'
import { EventsModule } from '../events/events.module.js'
import { GamificationRepository } from './application/gamification.repository.js'
import { GamificationInternalEventConsumer, GetMyGamificationUseCase } from './application/gamification.use-cases.js'
import { GamificationController } from './http/gamification.controller.js'
import { PrismaGamificationRepository } from './infrastructure/prisma-gamification.repository.js'

@Module({
  imports: [EventsModule],
  controllers: [GamificationController],
  providers: [
    PrismaGamificationRepository,
    { provide: GamificationRepository, useExisting: PrismaGamificationRepository },
    GamificationInternalEventConsumer,
    GetMyGamificationUseCase,
  ],
})
export class GamificationModule {}
