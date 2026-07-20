import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../database/prisma.service.js'
import { Prisma } from '../../../generated/prisma/client.js'
import { SessionRepository, type RotateRefreshResult } from '../application/session.repository.js'
import { UserNotEligibleForSessionError } from '../domain/session.errors.js'

interface LockedRefreshToken {
  tokenId: string
  sessionId: string
  userId: string
  tokenExpiresAt: Date
  consumedAt: Date | null
  tokenRevokedAt: Date | null
  absoluteExpiresAt: Date
  sessionRevokedAt: Date | null
  userStatus: 'ACTIVE' | 'DISABLED'
}

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  create(input: { userId: string; refreshTokenHash: string; refreshExpiresAt: Date; absoluteExpiresAt: Date; now: Date }) {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({ where: { id: input.userId }, select: { status: true } })
      if (user?.status !== 'ACTIVE') throw new UserNotEligibleForSessionError()

      const session = await transaction.authSession.create({
        data: {
          userId: input.userId,
          createdAt: input.now,
          lastSeenAt: input.now,
          absoluteExpiresAt: input.absoluteExpiresAt,
          refreshTokens: { create: { tokenHash: input.refreshTokenHash, createdAt: input.now, expiresAt: input.refreshExpiresAt } },
        },
      })
      await transaction.auditEvent.create({
        data: { actorType: 'SYSTEM', entityType: 'AuthSession', entityId: session.id, action: 'SESSION_CREATED', metadata: { userId: input.userId } },
      })
      return { sessionId: session.id, userId: session.userId, absoluteExpiresAt: session.absoluteExpiresAt }
    })
  }

  rotate(input: { currentTokenHash: string; nextTokenHash: string; nextExpiresAt: Date; now: Date }): Promise<RotateRefreshResult> {
    return this.prisma.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<LockedRefreshToken[]>`
          SELECT
            rt.id AS "tokenId",
            rt.session_id AS "sessionId",
            s.user_id AS "userId",
            rt.expires_at AS "tokenExpiresAt",
            rt.consumed_at AS "consumedAt",
            rt.revoked_at AS "tokenRevokedAt",
            s.absolute_expires_at AS "absoluteExpiresAt",
            s.revoked_at AS "sessionRevokedAt",
            u.status AS "userStatus"
          FROM refresh_tokens rt
          JOIN auth_sessions s ON s.id = rt.session_id
          JOIN users u ON u.id = s.user_id
          WHERE rt.token_hash = ${input.currentTokenHash}
          FOR UPDATE OF rt, s
        `
        const current = rows[0]
        if (!current || current.sessionRevokedAt) return { status: 'invalid' as const }

        if (current.consumedAt || current.tokenRevokedAt) {
          await this.revokeLockedSession(transaction, current, input.now, 'REFRESH_TOKEN_REUSE')
          await transaction.auditEvent.create({
            data: {
              actorType: 'SYSTEM',
              entityType: 'AuthSession',
              entityId: current.sessionId,
              action: 'REFRESH_TOKEN_REUSE_DETECTED',
              metadata: { userId: current.userId },
            },
          })
          return { status: 'reuse' as const }
        }

        if (current.userStatus !== 'ACTIVE' || current.absoluteExpiresAt <= input.now || current.tokenExpiresAt <= input.now) {
          await this.revokeLockedSession(transaction, current, input.now, current.userStatus !== 'ACTIVE' ? 'USER_DISABLED' : 'SESSION_EXPIRED')
          return { status: 'invalid' as const }
        }

        const expiresAt = current.absoluteExpiresAt < input.nextExpiresAt ? current.absoluteExpiresAt : input.nextExpiresAt
        const successor = await transaction.refreshToken.create({
          data: { sessionId: current.sessionId, tokenHash: input.nextTokenHash, createdAt: input.now, expiresAt },
        })
        await transaction.refreshToken.update({
          where: { id: current.tokenId },
          data: { consumedAt: input.now, replacedByTokenId: successor.id },
        })
        await transaction.authSession.update({ where: { id: current.sessionId }, data: { lastSeenAt: input.now } })
        return {
          status: 'rotated' as const,
          session: { sessionId: current.sessionId, userId: current.userId, absoluteExpiresAt: current.absoluteExpiresAt },
        }
      })
  }

  async findSessionIdByRefreshTokenHash(tokenHash: string) {
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, select: { sessionId: true } })
    return token?.sessionId ?? null
  }

  async revokeSession(input: { sessionId: string; reason: string; now: Date }) {
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.authSession.updateMany({
        where: { id: input.sessionId, revokedAt: null },
        data: { revokedAt: input.now, revocationReason: input.reason },
      })
      if (!updated.count) return
      await transaction.refreshToken.updateMany({ where: { sessionId: input.sessionId, revokedAt: null }, data: { revokedAt: input.now } })
      await transaction.auditEvent.create({
        data: { actorType: 'SYSTEM', entityType: 'AuthSession', entityId: input.sessionId, action: 'SESSION_REVOKED', metadata: { reason: input.reason } },
      })
    })
  }

  async revokeAllForUser(input: { userId: string; reason: string; now: Date }) {
    await this.prisma.$transaction(async (transaction) => {
      const sessions = await transaction.authSession.findMany({ where: { userId: input.userId, revokedAt: null }, select: { id: true } })
      if (!sessions.length) return
      const ids = sessions.map(({ id }) => id)
      await transaction.authSession.updateMany({ where: { id: { in: ids } }, data: { revokedAt: input.now, revocationReason: input.reason } })
      await transaction.refreshToken.updateMany({ where: { sessionId: { in: ids }, revokedAt: null }, data: { revokedAt: input.now } })
      await transaction.auditEvent.create({
        data: { actorType: 'SYSTEM', entityType: 'User', entityId: input.userId, action: 'USER_SESSIONS_REVOKED', metadata: { reason: input.reason, count: ids.length } },
      })
    })
  }

  private async revokeLockedSession(
    transaction: Prisma.TransactionClient,
    session: LockedRefreshToken,
    now: Date,
    reason: string,
  ) {
    await transaction.authSession.update({ where: { id: session.sessionId }, data: { revokedAt: now, revocationReason: reason } })
    await transaction.refreshToken.updateMany({ where: { sessionId: session.sessionId, revokedAt: null }, data: { revokedAt: now } })
  }
}
