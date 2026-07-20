import { HmacCsrfTokenService } from './hmac-csrf-token.service.js'

describe('HmacCsrfTokenService', () => {
  const config = { get: () => 'a-secure-pepper-with-more-than-32-characters' }
  const service = new HmacCsrfTokenService(config as never)

  it('issues tokens bound to one session and rejects tampering', () => {
    const token = service.issue('session-1')
    expect(service.verify(token, 'session-1')).toBe(true)
    expect(service.verify(token, 'session-2')).toBe(false)
    expect(service.verify(`${token}x`, 'session-1')).toBe(false)
  })
})
