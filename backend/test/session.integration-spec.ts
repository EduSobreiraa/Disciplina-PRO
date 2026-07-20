import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { AccessTokenService } from '../src/modules/identity-access/application/access-token.js'
import { CreateSessionUseCase } from '../src/modules/identity-access/application/create-session.use-case.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { RevokeAllSessionsUseCase } from '../src/modules/identity-access/application/revoke-all-sessions.use-case.js'
import { RevokeSessionUseCase } from '../src/modules/identity-access/application/revoke-session.use-case.js'
import { RotateSessionUseCase } from '../src/modules/identity-access/application/rotate-session.use-case.js'
import { RefreshTokenReuseError } from '../src/modules/identity-access/domain/session.errors.js'
import { IdentityAccessModule } from '../src/modules/identity-access/identity-access.module.js'

describe('Session core integration', () => {
  it('creates, rotates, detects reuse under concurrency and revokes sessions', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule, IdentityAccessModule],
    }).compile()
    await moduleRef.init()

    const prisma = moduleRef.get(PrismaService)
    const users = moduleRef.get(CreateUserUseCase)
    const createSession = moduleRef.get(CreateSessionUseCase)
    const rotateSession = moduleRef.get(RotateSessionUseCase)
    const revokeSession = moduleRef.get(RevokeSessionUseCase)
    const revokeAll = moduleRef.get(RevokeAllSessionsUseCase)
    const accessTokens = moduleRef.get(AccessTokenService)
    const user = await users.execute({ email: 'sessions@disciplina.test', password: 'uma frase de sessão muito segura' })

    const first = await createSession.execute({ userId: user.id })
    const firstClaims = await accessTokens.verify(first.accessToken)
    expect(firstClaims).toMatchObject({ userId: user.id, sessionId: first.sessionId })
    const storedFirstToken = await prisma.refreshToken.findFirstOrThrow({ where: { sessionId: first.sessionId } })
    expect(storedFirstToken.tokenHash).toHaveLength(64)
    expect(storedFirstToken.tokenHash).not.toBe(first.refreshToken)

    const rotated = await rotateSession.execute({ refreshToken: first.refreshToken })
    expect(rotated.sessionId).toBe(first.sessionId)
    await expect(rotateSession.execute({ refreshToken: first.refreshToken })).rejects.toBeInstanceOf(RefreshTokenReuseError)
    const reusedSession = await prisma.authSession.findUniqueOrThrow({ where: { id: first.sessionId } })
    expect(reusedSession).toMatchObject({ revocationReason: 'REFRESH_TOKEN_REUSE' })
    expect(reusedSession.revokedAt).toBeInstanceOf(Date)
    await expect(rotateSession.execute({ refreshToken: rotated.refreshToken })).rejects.toThrow('Sessão inválida ou expirada')

    const concurrent = await createSession.execute({ userId: user.id })
    const attempts = await Promise.allSettled([
      rotateSession.execute({ refreshToken: concurrent.refreshToken }),
      rotateSession.execute({ refreshToken: concurrent.refreshToken }),
    ])
    expect(attempts.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
    const rejection = attempts.find(({ status }) => status === 'rejected')
    expect(rejection?.status).toBe('rejected')
    if (rejection?.status !== 'rejected') throw new Error('Uma rotação concorrente deveria falhar')
    expect(rejection.reason).toBeInstanceOf(RefreshTokenReuseError)
    const concurrentSession = await prisma.authSession.findUniqueOrThrow({ where: { id: concurrent.sessionId } })
    expect(concurrentSession.revocationReason).toBe('REFRESH_TOKEN_REUSE')

    const explicit = await createSession.execute({ userId: user.id })
    await revokeSession.execute({ sessionId: explicit.sessionId })
    await expect(rotateSession.execute({ refreshToken: explicit.refreshToken })).rejects.toThrow('Sessão inválida ou expirada')

    const deviceOne = await createSession.execute({ userId: user.id })
    const deviceTwo = await createSession.execute({ userId: user.id })
    await revokeAll.execute({ userId: user.id, reason: 'SECURITY_INCIDENT' })
    const activeSessions = await prisma.authSession.count({ where: { userId: user.id, revokedAt: null } })
    expect(activeSessions).toBe(0)
    await expect(rotateSession.execute({ refreshToken: deviceOne.refreshToken })).rejects.toThrow('Sessão inválida ou expirada')
    await expect(rotateSession.execute({ refreshToken: deviceTwo.refreshToken })).rejects.toThrow('Sessão inválida ou expirada')

    const reuseAudit = await prisma.auditEvent.count({ where: { action: 'REFRESH_TOKEN_REUSE_DETECTED' } })
    expect(reuseAudit).toBe(2)
    await moduleRef.close()
  })
})
