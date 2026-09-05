export type ResendDeliveryStatus = 'SENT' | 'DELAYED' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'COMPLAINED' | 'SUPPRESSED'
export interface ResendDeliveryEvent {
  eventId: string
  providerEmailId: string
  status: ResendDeliveryStatus
  occurredAt: Date
}
export abstract class ResendDeliveryRepository {
  abstract recordSent(invitationId: string, providerEmailId: string, tokenHash?: string): Promise<void>
  abstract recordEvent(event: ResendDeliveryEvent): Promise<void>
  abstract isSuppressed(invitationId: string): Promise<boolean>
  abstract recordFailure(invitationId: string, tokenHash: string, reason: 'TEMPORARY' | 'PERMANENT' | 'AMBIGUOUS', retryJobId?: string): Promise<void>
}
