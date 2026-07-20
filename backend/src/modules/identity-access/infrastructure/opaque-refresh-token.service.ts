import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, randomBytes } from 'node:crypto'
import type { Environment } from '../../../config/environment.js'
import { RefreshTokenService } from '../application/refresh-token.js'

@Injectable()
export class OpaqueRefreshTokenService extends RefreshTokenService {
  constructor(private readonly config: ConfigService<Environment, true>) {
    super()
  }

  generate() {
    const plainText = randomBytes(32).toString('base64url')
    return { plainText, hash: this.hash(plainText) }
  }

  hash(plainText: string) {
    return createHmac('sha256', this.config.get('REFRESH_TOKEN_PEPPER', { infer: true })).update(plainText, 'utf8').digest('hex')
  }
}
