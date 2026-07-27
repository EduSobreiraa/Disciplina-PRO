import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'

export interface EnrollmentExecutionView {
  id: string
  programId: string
  programVersionId: string | null
  cycleNumber: number
  status: string
  timeZone: string | null
  startedAt: Date | null
  startedOn: Date | null
  completedAt: Date | null
  abandonedAt: Date | null
  abandonmentReason: string | null
  program: {
    slug: string
    name: string
  }
  version: {
    versionNumber: number
    title: string
    durationDays: number
    executionConfiguration: unknown
  } | null
  calendar: {
    today: Date
    programDay: number
    elapsedActiveDays: number
    isCompletable: boolean
  } | null
}

export interface EnrollmentExecutionDetailView extends EnrollmentExecutionView {
  activities: Array<{
    id: string
    key: string
    title: string
    type: string
    frequency: string
    configuration: unknown
    phaseKey: string
  }>
  activityCompletions: Array<{
    id: string
    activityId: string
    programDay: number
    programDate: Date
    occurrenceKey: string
    completedAt: Date
  }>
  dailyRecords: Array<{
    id: string
    programDay: number
    programDate: Date
    submittedAt: Date
    pillarScores: Array<{ pillarKey: string; score: number }>
  }>
}

export abstract class ExecutionQueryRepository {
  abstract list(context: CurrentTenantContext, now: Date): Promise<EnrollmentExecutionView[]>
  abstract find(context: CurrentTenantContext, enrollmentId: string, now: Date): Promise<EnrollmentExecutionDetailView | null>
}

export abstract class ExecutionLifecycleRepository {
  abstract start(context: CurrentTenantContext, enrollmentId: string, now: Date): Promise<EnrollmentExecutionView>
  abstract complete(context: CurrentTenantContext, enrollmentId: string, now: Date): Promise<EnrollmentExecutionView>
  abstract abandon(context: CurrentTenantContext, enrollmentId: string, reason: string, now: Date): Promise<EnrollmentExecutionView>
  abstract pause(context: CurrentTenantContext, enrollmentId: string, reason: string, now: Date): Promise<EnrollmentExecutionView>
  abstract resume(context: CurrentTenantContext, enrollmentId: string, now: Date): Promise<{ enrollment: EnrollmentExecutionView; blocked: boolean }>
}
