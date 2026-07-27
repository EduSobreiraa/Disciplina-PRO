import { Module } from '@nestjs/common'
import { ExecutionLifecycleRepository, ExecutionQueryRepository } from './application/execution.repository.js'
import { AbandonEnrollmentUseCase, CompleteEnrollmentUseCase, GetEnrollmentUseCase, ListEnrollmentsUseCase, PauseEnrollmentUseCase, ResumeEnrollmentUseCase, StartEnrollmentUseCase } from './application/execution.use-cases.js'
import { ExecutionAdministrativeBlocker } from './application/execution-blocker.js'
import { ExecutionCalendar } from './domain/execution-calendar.js'
import { EnrollmentsController } from './http/enrollments.controller.js'
import { PrismaExecutionRepository } from './infrastructure/prisma-execution.repository.js'
import { ObjectiveExecutionFactsRepository, PrivateExecutionResponseRepository } from './application/execution-facts.repository.js'
import { CompleteActivityUseCase, GetPrivateResponseUseCase, PutPrivateResponseUseCase, RecordDailyUseCase } from './application/execution-facts.use-cases.js'
import { PrismaPrivateExecutionResponseRepository } from './infrastructure/prisma-private-execution-response.repository.js'
import { PrivateResponsesController } from './http/private-responses.controller.js'
import { EventsModule } from '../events/events.module.js'

@Module({
  imports: [EventsModule],
  controllers: [EnrollmentsController, PrivateResponsesController],
  providers: [
    ExecutionCalendar,
    PrismaExecutionRepository,
    PrismaPrivateExecutionResponseRepository,
    { provide: ExecutionQueryRepository, useExisting: PrismaExecutionRepository },
    { provide: ExecutionLifecycleRepository, useExisting: PrismaExecutionRepository },
    { provide: ExecutionAdministrativeBlocker, useExisting: PrismaExecutionRepository },
    { provide: ObjectiveExecutionFactsRepository, useExisting: PrismaExecutionRepository },
    { provide: PrivateExecutionResponseRepository, useExisting: PrismaPrivateExecutionResponseRepository },
    ListEnrollmentsUseCase,
    GetEnrollmentUseCase,
    StartEnrollmentUseCase,
    CompleteEnrollmentUseCase,
    AbandonEnrollmentUseCase,
    PauseEnrollmentUseCase,
    ResumeEnrollmentUseCase,
    CompleteActivityUseCase,
    RecordDailyUseCase,
    PutPrivateResponseUseCase,
    GetPrivateResponseUseCase,
  ],
  exports: [ExecutionAdministrativeBlocker],
})
export class ExecutionModule {}
