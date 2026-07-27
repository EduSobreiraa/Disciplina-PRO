import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'

export interface ActivityCompletionView {
  id: string
  activityId: string
  programDay: number
  programDate: Date
  occurrenceKey: string
  completedAt: Date
}

export interface DailyRecordView {
  id: string
  programDay: number
  programDate: Date
  submittedAt: Date
  pillarScores: Array<{ pillarKey: string; score: number }>
}

export abstract class ObjectiveExecutionFactsRepository {
  abstract completeActivity(context: CurrentTenantContext, input: {
    enrollmentId: string
    activityId: string
    now: Date
  }): Promise<ActivityCompletionView>

  abstract recordDaily(context: CurrentTenantContext, input: {
    enrollmentId: string
    scores: Array<{ pillarKey: string; score: number }>
    now: Date
  }): Promise<DailyRecordView>
}

export interface PrivateResponseView {
  id: string
  activityId: string
  programDay: number
  programDate: Date
  payload: Record<string, unknown>
  submittedAt: Date
  updatedAt: Date
}

export abstract class PrivateExecutionResponseRepository {
  abstract put(context: CurrentTenantContext, input: {
    enrollmentId: string
    activityId: string
    payload: Record<string, unknown>
    now: Date
  }): Promise<PrivateResponseView>

  abstract get(context: CurrentTenantContext, input: {
    enrollmentId: string
    activityId: string
    now: Date
  }): Promise<PrivateResponseView | null>
}
