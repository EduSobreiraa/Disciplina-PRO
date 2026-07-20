export interface AccessTokenClaims {
  userId: string
  sessionId: string
  tokenId: string
  issuedAt: Date
  expiresAt: Date
}

export abstract class AccessTokenService {
  abstract issue(input: { userId: string; sessionId: string; now: Date }): Promise<{ token: string; expiresAt: Date }>
  abstract verify(token: string): Promise<AccessTokenClaims>
}
