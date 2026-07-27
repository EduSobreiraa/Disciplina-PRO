import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import type { InternalEventEnvelope } from '../../events/application/internal-event.contracts.js'
import type { XpRule } from '../domain/gamification-rules.js'

export interface GamificationView {
  balance: number
  level: { level: number; key: string; name: string; minimum: number }
  nextLevel: { level: number; key: string; name: string; minimum: number } | null
  progress: number
  transactions: Array<{
    id: string
    ruleKey: string
    eventType: string
    amount: number
    description: string
    occurredAt: Date
  }>
  achievements: Array<{
    key: string
    name: string
    description: string
    unlockedAt: Date
  }>
}

export abstract class GamificationRepository<TTransaction = unknown> {
  abstract apply(transaction: TTransaction, event: InternalEventEnvelope, rule: XpRule): Promise<void>
  abstract findMine(context: CurrentTenantContext): Promise<GamificationView | null>
}

