export interface InvitationNotice {
  id: string
  invitationId: string
  email: string
}

export abstract class InvitationNoticeDelivery {
  abstract send(notice: InvitationNotice): Promise<'SENT' | 'FAILED' | 'BLOCKED' | 'UNCERTAIN'>
}

export abstract class InvitationNoticeRepository {
  abstract reviewInterrupted(now: Date): Promise<void>
  abstract findPending(): Promise<Array<{ id: string }>>
  abstract claim(id: string, now: Date): Promise<InvitationNotice | null>
  abstract finish(id: string, status: 'SENT' | 'FAILED' | 'BLOCKED' | 'UNCERTAIN'): Promise<void>
}
