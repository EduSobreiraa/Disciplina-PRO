import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'

export interface RitualDayView {
  date: Date
  checks: Array<{ sectionKey: string; itemKey: string; completedAt: Date }>
  timer: {
    completedCycles: number
    remainingSeconds: number
    runningStartedAt: Date | null
    runningUntil: Date | null
  }
}

export type RitualChangeResult =
  | { kind: 'changed'; day: RitualDayView }
  | { kind: 'context-not-found' | 'future-date' | 'timer-date' }

export abstract class RitualRepository {
  abstract findMine(context: CurrentTenantContext, range: { from: Date; to: Date }, now: Date): Promise<RitualDayView[] | null>
  abstract setCheck(context: CurrentTenantContext, date: Date, sectionKey: string, itemKey: string, completed: boolean, now: Date): Promise<RitualChangeResult>
  abstract changeTimer(context: CurrentTenantContext, date: Date, action: 'start' | 'pause' | 'reset', now: Date): Promise<RitualChangeResult>
}
