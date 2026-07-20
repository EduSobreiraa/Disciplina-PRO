export interface GeneratedRefreshToken {
  plainText: string
  hash: string
}

export abstract class RefreshTokenService {
  abstract generate(): GeneratedRefreshToken
  abstract hash(plainText: string): string
}
