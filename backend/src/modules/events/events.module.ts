import { Module } from '@nestjs/common'
import { InternalEventPublisher } from './application/internal-event.contracts.js'
import { InternalEventConsumerRegistry } from './application/internal-event-consumer.js'
import { InternalEventProcessingRepository } from './application/internal-event-processing.repository.js'
import {
  GetInternalEventMetricsUseCase,
  ProcessInternalEventsUseCase,
  ReprocessInternalEventDeliveryUseCase,
} from './application/process-internal-events.use-case.js'
import { PrismaInternalEventsRepository } from './infrastructure/prisma-internal-events.repository.js'

@Module({
  providers: [
    InternalEventConsumerRegistry,
    PrismaInternalEventsRepository,
    { provide: InternalEventPublisher, useExisting: PrismaInternalEventsRepository },
    { provide: InternalEventProcessingRepository, useExisting: PrismaInternalEventsRepository },
    ProcessInternalEventsUseCase,
    ReprocessInternalEventDeliveryUseCase,
    GetInternalEventMetricsUseCase,
  ],
  exports: [
    InternalEventPublisher,
    InternalEventConsumerRegistry,
    ProcessInternalEventsUseCase,
    ReprocessInternalEventDeliveryUseCase,
    GetInternalEventMetricsUseCase,
  ],
})
export class EventsModule {}

