import type { TrackerMarkStatus } from '../../../generated/prisma/client.js'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'

export interface TrackerStateView {
  behaviors: Array<{ id: string; name: string; position: number; active: boolean }>
  marks: Array<{
    id: string
    behaviorId: string
    trackedOn: Date
    status: TrackerMarkStatus
    justification: string | null
  }>
}

export interface TrackerBackupData {
  behaviors: Array<{ key: string; name: string; position: number; active: boolean }>
  marks: Array<{
    behaviorKey: string
    trackedOn: Date
    status: TrackerMarkStatus
    justification: string | null
  }>
}

export type CreateBehaviorResult =
  | { kind: 'created'; behavior: TrackerStateView['behaviors'][number] }
  | { kind: 'limit' | 'duplicate' | 'context-not-found' }

export type ChangeBehaviorResult = 'changed' | 'not-found' | 'duplicate' | 'context-not-found'
export type ChangeMarkResult = 'changed' | 'behavior-not-found' | 'mark-not-found' | 'future-date' | 'context-not-found'
export type ChangeJustificationResult = 'changed' | 'mark-not-found' | 'not-failed' | 'context-not-found'
export type RestoreTrackerResult = 'restored' | 'context-not-found' | 'future-date'

export abstract class TrackerRepository {
  abstract findMine(context: CurrentTenantContext, range: { from: Date; to: Date }): Promise<TrackerStateView | null>
  abstract createBehavior(context: CurrentTenantContext, input: { name: string; normalizedName: string }): Promise<CreateBehaviorResult>
  abstract renameBehavior(context: CurrentTenantContext, behaviorId: string, input: { name: string; normalizedName: string }): Promise<ChangeBehaviorResult>
  abstract archiveBehavior(context: CurrentTenantContext, behaviorId: string): Promise<ChangeBehaviorResult>
  abstract putMark(context: CurrentTenantContext, behaviorId: string, trackedOn: Date, status: TrackerMarkStatus): Promise<ChangeMarkResult>
  abstract deleteMark(context: CurrentTenantContext, behaviorId: string, trackedOn: Date): Promise<ChangeMarkResult>
  abstract putJustification(context: CurrentTenantContext, behaviorId: string, trackedOn: Date, text: string): Promise<ChangeJustificationResult>
  abstract exportBackup(context: CurrentTenantContext): Promise<TrackerBackupData | null>
  abstract restoreBackup(context: CurrentTenantContext, data: TrackerBackupData): Promise<RestoreTrackerResult>
}
