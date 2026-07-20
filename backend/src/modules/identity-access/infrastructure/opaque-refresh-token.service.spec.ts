import { ConfigService } from '@nestjs/config'
import type { Environment } from '../../../config/environment.js'
import { OpaqueRefreshTokenService } from './opaque-refresh-token.service.js'

describe('OpaqueRefreshTokenService', () => {
  const config = new ConfigService<Environment, true>({ REFRESH_TOKEN_PEPPER: 'test-pepper-with-more-than-32-characters' } as Environment)
  const service = new OpaqueRefreshTokenService(config)

  it('generates 256-bit opaque secrets and stable HMAC hashes', () => {
    const first = service.generate()
    const second = service.generate()

    expect(Buffer.from(first.plainText, 'base64url')).toHaveLength(32)
    expect(first.plainText).not.toBe(second.plainText)
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(first.hash).toBe(service.hash(first.plainText))
    expect(first.hash).not.toContain(first.plainText)
  })
})
