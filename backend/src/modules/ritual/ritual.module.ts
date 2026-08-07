import { Module } from '@nestjs/common'
import { RitualClock, SystemRitualClock } from './application/ritual-clock.js'
import { RitualRepository } from './application/ritual.repository.js'
import { ChangeRitualTimerUseCase, GetMyRitualUseCase, SetRitualCheckUseCase } from './application/ritual.use-cases.js'
import { RitualController } from './http/ritual.controller.js'
import { PrismaRitualRepository } from './infrastructure/prisma-ritual.repository.js'

@Module({
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
