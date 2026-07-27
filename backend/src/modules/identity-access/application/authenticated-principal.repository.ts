export interface CurrentPrincipal {
  userId: string
  sessionId: string
  tokenId: string
}

export abstract class AuthenticatedPrincipalRepository {
  abstract isSessionActive(input: { userId: string; sessionId: string; now: Date }): Promise<boolean>
}
