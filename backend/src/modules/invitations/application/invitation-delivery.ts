export interface InvitationDeliveryMessage {
  invitationId: string
  email: string
  token: string
  expiresAt: Date
}

export abstract class InvitationDelivery {
  abstract send(message: InvitationDeliveryMessage): Promise<'SENT' | 'FAILED'>
}
