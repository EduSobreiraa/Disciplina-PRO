export const INTERNAL_EVENT_TYPES = {
  activityCompletionRecorded: 'execution.activity-completion.recorded.v1',
  dailyRecordSubmitted: 'execution.daily-record.submitted.v1',
  enrollmentCompleted: 'execution.enrollment.completed.v1',
  trackerMarkRecorded: 'tracker.mark.recorded.v1',
  ritualCheckCompleted: 'ritual.check.completed.v1',
} as const

export interface InternalEventDraft {
  tenantId: string | null
  type: string
  version: number
  aggregateType: string
  aggregateId: string
  sourceKey: string
  payload: Record<string, string | number | boolean | null>
  occurredAt: Date
}

export interface InternalEventEnvelope extends InternalEventDraft {
  id: string
  createdAt: Date
}

export abstract class InternalEventPublisher<TTransaction = unknown> {
  abstract publish(transaction: TTransaction, event: InternalEventDraft): Promise<InternalEventEnvelope>
}
