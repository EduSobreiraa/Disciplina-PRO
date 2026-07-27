import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, randomBytes } from 'node:crypto'
import type { Environment } from '../../../config/environment.js'
import { InvitationTokenService } from '../application/invitation-token.js'

@Injectable()
export class HmacInvitationTokenService extends InvitationTokenService {
  constructor(private readonly config: ConfigService<Environment, true>) { super() }

  generate() {
    const plainText = randomBytes(32).toString('base64url')
    return { plainText, hash: this.hash(plainText) }
  }

  hash(plainText: string) {
    return createHmac('sha256', this.config.get('INVITATION_TOKEN_PEPPER', { infer: true })).update(plainText, 'utf8').digest('hex')
  }
}
