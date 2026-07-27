import type { InternalEventEnvelope } from '../../events/application/internal-event.contracts.js'

export interface DerivedAuditFact {
  entityType: string
  entityId: string | null
  action: string
  targetMembershipId?: string
}

export abstract class AuditWriter<TTransaction = unknown> {
  abstract recordDerived(
    transaction: TTransaction,
    event: InternalEventEnvelope,
    fact: DerivedAuditFact,
  ): Promise<void>
}
