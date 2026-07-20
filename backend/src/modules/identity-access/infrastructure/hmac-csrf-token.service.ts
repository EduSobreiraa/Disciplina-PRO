import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Environment } from '../../../config/environment.js'
import { CsrfTokenService } from '../application/csrf-token.js'

@Injectable()
export class HmacCsrfTokenService extends CsrfTokenService {
  private readonly key: Buffer
  constructor(config: ConfigService<Environment, true>) {
    super()
    this.key = createHmac('sha256', config.get('REFRESH_TOKEN_PEPPER', { infer: true })).update('disciplina-pro:csrf:v1').digest()
  }
  issue(sessionId: string) {
    const payload = Buffer.from(`${sessionId}:${randomBytes(24).toString('base64url')}`).toString('base64url')
    return `${payload}.${this.sign(payload)}`
  }
  verify(token: string, sessionId: string) {
    const [payload, signature, extra] = token.split('.')
    if (!payload || !signature || extra) return false
    let embeddedSession: string
    try { embeddedSession = Buffer.from(payload, 'base64url').toString().split(':', 1)[0] ?? '' } catch { return false }
    const expected = this.sign(payload)
    const receivedBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    return embeddedSession === sessionId && receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
  }
  private sign(payload: string) { return createHmac('sha256', this.key).update(payload).digest('base64url') }
}
