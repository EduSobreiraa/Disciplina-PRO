import { HmacInvitationTokenService } from './hmac-invitation-token.service.js'

describe('HmacInvitationTokenService', () => {
  it('generates an opaque token and persists only a deterministic HMAC', () => {
    const service = new HmacInvitationTokenService({
      get: () => 'invitation-test-pepper-with-at-least-32-characters',
    } as never)
    const first = service.generate()
    const second = service.generate()

    expect(first.plainText).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(first.hash).not.toContain(first.plainText)
    expect(service.hash(first.plainText)).toBe(first.hash)
    expect(second).not.toEqual(first)
  })
})
