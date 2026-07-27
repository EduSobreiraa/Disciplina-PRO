export interface AcceptedInvitation {
  invitationId: string
  tenantId: string
  membershipId: string
  userId: string
  role: 'USER' | 'MANAGER' | 'CEO'
  identityCreated: boolean
  acceptedAt: Date
}

export abstract class InvitationAcceptanceRepository {
  abstract acceptForNewIdentity(input: { tokenHash: string; passwordHash: string; now: Date }): Promise<AcceptedInvitation>
  abstract acceptForExistingIdentity(input: { tokenHash: string; userId: string; now: Date }): Promise<AcceptedInvitation>
}
