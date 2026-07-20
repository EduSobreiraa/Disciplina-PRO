import { Injectable, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import {
  SignJWT,
  CompactSign,
  compactVerify,
  decodeProtectedHeader,
  generateKeyPair,
  importPKCS8,
  importSPKI,
  jwtVerify,
  type CryptoKey,
} from 'jose'
import type { Environment } from '../../../config/environment.js'
import { AccessTokenService, type AccessTokenClaims } from '../application/access-token.js'
import { InvalidAccessTokenError, JwtKeyConfigurationError } from '../domain/session.errors.js'

const ACCESS_TOKEN_DURATION_SECONDS = 10 * 60

interface KeySet {
  activeKid: string
  privateKey: CryptoKey
  publicKeys: Map<string, CryptoKey>
}

@Injectable()
export class JoseAccessTokenService extends AccessTokenService implements OnModuleInit {
  private keySetPromise?: Promise<KeySet>

  constructor(private readonly config: ConfigService<Environment, true>) {
    super()
  }

  async onModuleInit() {
    await this.getKeySet()
  }

  async issue(input: { userId: string; sessionId: string; now: Date }) {
    const keys = await this.getKeySet()
    const issuedAt = Math.floor(input.now.getTime() / 1000)
    const expiresAt = new Date((issuedAt + ACCESS_TOKEN_DURATION_SECONDS) * 1000)
    const token = await new SignJWT({ sid: input.sessionId })
      .setProtectedHeader({ alg: 'RS256', kid: keys.activeKid, typ: 'at+jwt' })
      .setIssuer(this.config.get('JWT_ISSUER', { infer: true }))
      .setAudience(this.config.get('JWT_AUDIENCE', { infer: true }))
      .setSubject(input.userId)
      .setJti(randomUUID())
      .setIssuedAt(issuedAt)
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(keys.privateKey)

    return { token, expiresAt }
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    try {
      const keys = await this.getKeySet()
      const header = decodeProtectedHeader(token)
      if (header.alg !== 'RS256' || header.typ !== 'at+jwt' || typeof header.kid !== 'string') throw new InvalidAccessTokenError()
      const publicKey = keys.publicKeys.get(header.kid)
      if (!publicKey) throw new InvalidAccessTokenError()

      const { payload } = await jwtVerify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.config.get('JWT_ISSUER', { infer: true }),
        audience: this.config.get('JWT_AUDIENCE', { infer: true }),
        typ: 'at+jwt',
        requiredClaims: ['sub', 'sid', 'jti', 'iat', 'exp'],
      })
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string' || typeof payload.jti !== 'string' || !payload.iat || !payload.exp) {
        throw new InvalidAccessTokenError()
      }

      return {
        userId: payload.sub,
        sessionId: payload.sid,
        tokenId: payload.jti,
        issuedAt: new Date(payload.iat * 1000),
        expiresAt: new Date(payload.exp * 1000),
      }
    } catch (error) {
      if (error instanceof InvalidAccessTokenError) throw error
      throw new InvalidAccessTokenError()
    }
  }

  private getKeySet() {
    this.keySetPromise ??= this.loadKeySet()
    return this.keySetPromise
  }

  private async loadKeySet(): Promise<KeySet> {
    const activeKid = this.config.get('JWT_ACTIVE_KID', { infer: true })
    const privateKeyBase64 = this.config.get('JWT_PRIVATE_KEY_BASE64', { infer: true })
    const publicKeysJson = this.config.get('JWT_PUBLIC_KEYS_JSON', { infer: true })

    if (!privateKeyBase64 && !publicKeysJson && this.config.get('NODE_ENV', { infer: true }) !== 'production') {
      const pair = await generateKeyPair('RS256', { modulusLength: 2048, extractable: false })
      return { activeKid, privateKey: pair.privateKey, publicKeys: new Map([[activeKid, pair.publicKey]]) }
    }
    if (!privateKeyBase64 || !publicKeysJson) throw new JwtKeyConfigurationError()

    try {
      const privateKey = await importPKCS8(Buffer.from(privateKeyBase64, 'base64').toString('utf8'), 'RS256')
      const encodedPublicKeys = JSON.parse(publicKeysJson) as unknown
      if (!encodedPublicKeys || typeof encodedPublicKeys !== 'object' || Array.isArray(encodedPublicKeys)) throw new JwtKeyConfigurationError()

      const publicKeys = new Map<string, CryptoKey>()
      for (const [kid, encodedKey] of Object.entries(encodedPublicKeys)) {
        if (typeof encodedKey !== 'string' || !kid) throw new JwtKeyConfigurationError()
        publicKeys.set(kid, await importSPKI(Buffer.from(encodedKey, 'base64').toString('utf8'), 'RS256'))
      }
      if (!publicKeys.has(activeKid)) throw new JwtKeyConfigurationError('JWT_PUBLIC_KEYS_JSON não contém JWT_ACTIVE_KID')
      const activePublicKey = publicKeys.get(activeKid)
      if (!activePublicKey) throw new JwtKeyConfigurationError()
      const probe = await new CompactSign(new TextEncoder().encode('disciplina-pro-key-pair-check'))
        .setProtectedHeader({ alg: 'RS256', kid: activeKid })
        .sign(privateKey)
      await compactVerify(probe, activePublicKey, { algorithms: ['RS256'] })
      return { activeKid, privateKey, publicKeys }
    } catch (error) {
      if (error instanceof JwtKeyConfigurationError) throw error
      throw new JwtKeyConfigurationError()
    }
  }
}
