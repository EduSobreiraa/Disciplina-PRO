export interface PersistedSession {
  sessionId: string
  userId: string
  absoluteExpiresAt: Date
}

export type RotateRefreshResult =
  | { status: 'rotated'; session: PersistedSession }
  | { status: 'invalid' }
  | { status: 'reuse' }

export abstract class SessionRepository {
  abstract create(input: { userId: string; refreshTokenHash: string; refreshExpiresAt: Date; absoluteExpiresAt: Date; now: Date }): Promise<PersistedSession>
  abstract rotate(input: { currentTokenHash: string; nextTokenHash: string; nextExpiresAt: Date; now: Date }): Promise<RotateRefreshResult>
  abstract revokeSession(input: { sessionId: string; reason: string; now: Date }): Promise<void>
  abstract revokeAllForUser(input: { userId: string; reason: string; now: Date }): Promise<void>
}
