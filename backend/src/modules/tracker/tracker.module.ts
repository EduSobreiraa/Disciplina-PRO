import { Module } from '@nestjs/common'
import { TrackerRepository } from './application/tracker.repository.js'
import {
  ArchiveTrackerBehaviorUseCase,
  CreateTrackerBehaviorUseCase,
  DeleteTrackerMarkUseCase,
  ExportTrackerBackupUseCase,
  GetMyTrackerUseCase,
  PutTrackerJustificationUseCase,
  PutTrackerMarkUseCase,
  RenameTrackerBehaviorUseCase,
  RestoreTrackerBackupUseCase,
} from './application/tracker.use-cases.js'
import { TrackerController } from './http/tracker.controller.js'
import { PrismaTrackerRepository } from './infrastructure/prisma-tracker.repository.js'

@Module({
  controllers: [TrackerController],
  providers: [
    PrismaTrackerRepository,
    { provide: TrackerRepository, useExisting: PrismaTrackerRepository },
    GetMyTrackerUseCase,
    CreateTrackerBehaviorUseCase,
    RenameTrackerBehaviorUseCase,
    ArchiveTrackerBehaviorUseCase,
    PutTrackerMarkUseCase,
    DeleteTrackerMarkUseCase,
    PutTrackerJustificationUseCase,
    ExportTrackerBackupUseCase,
    RestoreTrackerBackupUseCase,
  ],
})
export class TrackerModule {}
