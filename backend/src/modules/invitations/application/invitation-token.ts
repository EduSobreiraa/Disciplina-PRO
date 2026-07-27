export abstract class InvitationTokenService {
  abstract generate(): { plainText: string; hash: string }
  abstract hash(plainText: string): string
}
