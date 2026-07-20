import { ConfigService } from '@nestjs/config'
import { SignJWT, exportPKCS8, exportSPKI, generateKeyPair } from 'jose'
import type { Environment } from '../../../config/environment.js'
import { InvalidAccessTokenError } from '../domain/session.errors.js'
import { JoseAccessTokenService } from './jose-access-token.service.js'

describe('JoseAccessTokenService', () => {
  const config = new ConfigService<Environment, true>({
    NODE_ENV: 'test',
    JWT_ISSUER: 'https://issuer.disciplina.test',
    JWT_AUDIENCE: 'disciplina-pro-api',
    JWT_ACTIVE_KID: 'test-ephemeral',
  } as Environment)
  const service = new JoseAccessTokenService(config)

  it('issues and validates a typed RS256 access token with minimal claims', async () => {
    const now = new Date()
    const issued = await service.issue({ userId: '019c0000-0000-7000-8000-000000000001', sessionId: '019c0000-0000-7000-8000-000000000002', now })
    const claims = await service.verify(issued.token)

    expect(claims).toMatchObject({
      userId: '019c0000-0000-7000-8000-000000000001',
      sessionId: '019c0000-0000-7000-8000-000000000002',
    })
    expect(claims.tokenId).toMatch(/^[0-9a-f-]{36}$/)
    expect(issued.expiresAt.getTime() - Math.floor(now.getTime() / 1000) * 1000).toBe(10 * 60 * 1000)
    expect(issued.token).not.toContain('SUPER_ADMIN')
  })

  it('rejects a modified token', async () => {
    const issued = await service.issue({ userId: '019c0000-0000-7000-8000-000000000001', sessionId: '019c0000-0000-7000-8000-000000000002', now: new Date() })
    const parts = issued.token.split('.')
    parts[1] = `${parts[1]?.startsWith('a') ? 'b' : 'a'}${parts[1]?.slice(1)}`
    const modified = parts.join('.')
    await expect(service.verify(modified)).rejects.toBeInstanceOf(InvalidAccessTokenError)
  })

  it('signs with the active kid and still verifies tokens from a previous allowlisted key', async () => {
    const active = await generateKeyPair('RS256', { modulusLength: 2048, extractable: true })
    const previous = await generateKeyPair('RS256', { modulusLength: 2048, extractable: true })
    const activePrivate = Buffer.from(await exportPKCS8(active.privateKey)).toString('base64')
    const publicKeys = JSON.stringify({
      active: Buffer.from(await exportSPKI(active.publicKey)).toString('base64'),
      previous: Buffer.from(await exportSPKI(previous.publicKey)).toString('base64'),
    })
    const rotatingConfig = new ConfigService<Environment, true>({
      NODE_ENV: 'test',
      JWT_ISSUER: 'https://issuer.disciplina.test',
      JWT_AUDIENCE: 'disciplina-pro-api',
      JWT_ACTIVE_KID: 'active',
      JWT_PRIVATE_KEY_BASE64: activePrivate,
      JWT_PUBLIC_KEYS_JSON: publicKeys,
    } as Environment)
    const rotatingService = new JoseAccessTokenService(rotatingConfig)
    const now = Math.floor(Date.now() / 1000)
    const previousToken = await new SignJWT({ sid: 'session-previous' })
      .setProtectedHeader({ alg: 'RS256', kid: 'previous', typ: 'at+jwt' })
      .setIssuer('https://issuer.disciplina.test')
      .setAudience('disciplina-pro-api')
      .setSubject('user-previous')
      .setJti('token-previous')
      .setIssuedAt(now)
      .setExpirationTime(now + 600)
      .sign(previous.privateKey)

    await expect(rotatingService.verify(previousToken)).resolves.toMatchObject({ userId: 'user-previous', sessionId: 'session-previous' })
    const activeToken = await rotatingService.issue({ userId: 'user-active', sessionId: 'session-active', now: new Date() })
    await expect(rotatingService.verify(activeToken.token)).resolves.toMatchObject({ userId: 'user-active', sessionId: 'session-active' })
  })
})
