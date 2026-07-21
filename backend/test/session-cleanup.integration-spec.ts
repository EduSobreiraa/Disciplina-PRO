import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { CleanupSessionsUseCase } from '../src/modules/identity-access/application/cleanup-sessions.use-case.js'
import { CreateSessionUseCase } from '../src/modules/identity-access/application/create-session.use-case.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { RevokeSessionUseCase } from '../src/modules/identity-access/application/revoke-session.use-case.js'
import { IdentityAccessModule } from '../src/modules/identity-access/identity-access.module.js'

describe('Session cleanup integration', () => {
  it('revokes expired sessions, purges only after 90 days and remains idempotent', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule, IdentityAccessModule],
    }).compile()
    await moduleRef.init()
    const prisma = moduleRef.get(PrismaService)
    const user = await moduleRef.get(CreateUserUseCase).execute({ email: `cleanup-${Date.now()}@disciplina.test`, password: 'uma frase para limpeza segura' })
    const create = moduleRef.get(CreateSessionUseCase)
    const revoke = moduleRef.get(RevokeSessionUseCase)
    const cleanup = moduleRef.get(CleanupSessionsUseCase)

    const expired = await create.execute({ userId: user.id })
    await prisma.authSession.update({
      where: { id: expired.sessionId },
      data: { createdAt: new Date(Date.now() - 31 * 86_400_000), absoluteExpiresAt: new Date(Date.now() - 86_400_000) },
    })
    const oldRevoked = await create.execute({ userId: user.id })
    await revoke.execute({ sessionId: oldRevoked.sessionId })
    await prisma.authSession.update({ where: { id: oldRevoked.sessionId }, data: { revokedAt: new Date(Date.now() - 91 * 86_400_000) } })

    await expect(cleanup.execute()).resolves.toEqual({ expiredSessionsRevoked: 1, sessionsPurged: 1 })
    const expiredAfterCleanup = await prisma.authSession.findUniqueOrThrow({ where: { id: expired.sessionId } })
    expect(expiredAfterCleanup).toMatchObject({ revocationReason: 'SESSION_EXPIRED' })
    expect(expiredAfterCleanup.revokedAt).toBeInstanceOf(Date)
    expect(await prisma.refreshToken.count({ where: { sessionId: expired.sessionId, revokedAt: null } })).toBe(0)
    expect(await prisma.authSession.findUnique({ where: { id: oldRevoked.sessionId } })).toBeNull()
    expect(await prisma.auditEvent.count({ where: { entityId: oldRevoked.sessionId } })).toBeGreaterThan(0)
    await expect(cleanup.execute()).resolves.toEqual({ expiredSessionsRevoked: 0, sessionsPurged: 0 })
    await moduleRef.close()
  })
})
