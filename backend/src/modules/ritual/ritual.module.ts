import { Module } from '@nestjs/common'
import { EventsModule } from '../events/events.module.js'
import { RitualClock, SystemRitualClock } from './application/ritual-clock.js'
import { RitualRepository } from './application/ritual.repository.js'
import { ChangeRitualTimerUseCase, GetMyRitualUseCase, SetRitualCheckUseCase } from './application/ritual.use-cases.js'
import { RitualController } from './http/ritual.controller.js'
import { PrismaRitualRepository } from './infrastructure/prisma-ritual.repository.js'

@Module({
  imports: [EventsModule],
  controllers: [RitualController],
  providers: [
    PrismaRitualRepository,
    { provide: RitualRepository, useExisting: PrismaRitualRepository },
    { provide: RitualClock, useClass: SystemRitualClock },
    GetMyRitualUseCase,
    SetRitualCheckUseCase,
    ChangeRitualTimerUseCase,
  ],
})
export class RitualModule {}
