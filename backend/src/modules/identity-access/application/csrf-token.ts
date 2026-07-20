export abstract class CsrfTokenService {
  abstract issue(sessionId: string): string
  abstract verify(token: string, sessionId: string): boolean
}
