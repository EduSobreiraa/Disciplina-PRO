export interface InvitationRetryCandidate { id: string; invitationId: string }
export interface ClaimedInvitationRetry { invitationId: string; email: string; expiresAt: Date; retryJobId: string }
export abstract class InvitationRetryRepository {
  abstract reviewInterrupted(now: Date): Promise<number>
  abstract findDue(now: Date): Promise<InvitationRetryCandidate[]>
  abstract claim(candidate: InvitationRetryCandidate, tokenHash: string, now: Date): Promise<ClaimedInvitationRetry | 'cancelled' | null>
  abstract finish(id: string, sent: boolean): Promise<void>
}
