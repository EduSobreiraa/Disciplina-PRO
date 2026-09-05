import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../database/prisma.service.js'
import type { Prisma } from '../../../generated/prisma/client.js'
import { ResendDeliveryRepository, type ResendDeliveryEvent } from '../application/resend-delivery.repository.js'

@Injectable()
export class PrismaResendDeliveryRepository extends ResendDeliveryRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  async recordFailure(invitationId: string, tokenHash: string, reason: 'TEMPORARY' | 'PERMANENT' | 'AMBIGUOUS', retryJobId?: string) {
    if (retryJobId) {
      await this.prisma.invitationEmailRetry.updateMany({ where: { id: retryJobId, invitationId, status: 'CLAIMED' }, data: { status: 'REVIEW', reason: reason === 'TEMPORARY' ? 'EXHAUSTED' : reason } })
      return
    }
    const invitation = await this.prisma.invitation.findFirst({ where: { id: invitationId, tokenHash, status: 'PENDING', expiresAt: { gt: new Date() } }, select: { id: true } })
    if (!invitation) return
    const data = { invitationId, expectedTokenHash: tokenHash, status: reason === 'TEMPORARY' ? 'PENDING' : 'REVIEW', reason, dueAt: new Date(Date.now() + 30 * 60_000) }
    await this.prisma.invitationEmailRetry.upsert({ where: { invitationId_expectedTokenHash: { invitationId, expectedTokenHash: tokenHash } }, create: data, update: reason === 'TEMPORARY' ? {} : { status: 'REVIEW', reason } })
  }

  async isSuppressed(invitationId: string) {
    const invitation = await this.prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, select: { normalizedEmail: true } })
    return Boolean(await this.prisma.resendInvitationMessage.findFirst({
      where: { invitation: { normalizedEmail: invitation.normalizedEmail }, status: { in: ['BOUNCED', 'COMPLAINED', 'SUPPRESSED'] } },
      select: { providerEmailId: true },
    }))
  }

  async recordSent(invitationId: string, providerEmailId: string, tokenHash?: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, providerEmailId)
      const existing = await tx.resendInvitationMessage.findUnique({ where: { providerEmailId } })
      if (existing && existing.invitationId !== invitationId) throw new Error('RESEND_MESSAGE_CONFLICT')
      await tx.resendInvitationMessage.upsert({ where: { providerEmailId }, create: { invitationId, providerEmailId }, update: {} })
      await this.project(tx, providerEmailId)
      if (tokenHash) await tx.invitationEmailRetry.updateMany({ where: { invitationId, expectedTokenHash: tokenHash, status: 'PENDING' }, data: { status: 'CANCELLED' } })
    })
  }

  async recordEvent(event: ResendDeliveryEvent) {
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, event.providerEmailId)
      const result = await tx.resendEmailEvent.createMany({ data: [event], skipDuplicates: true })
      if (result.count) await this.project(tx, event.providerEmailId)
    })
  }

  private lock(tx: Prisma.TransactionClient, id: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:resend:${id}`}))`
  }

  private async project(tx: Prisma.TransactionClient, providerEmailId: string) {
    const events = await tx.resendEmailEvent.findMany({ where: { providerEmailId }, select: { status: true } })
    // Safety signals are sticky, even if delivered/sent arrives later.
    // A delay is not a retry instruction: Resend may still be delivering.
    const priority = ['COMPLAINED', 'BOUNCED', 'SUPPRESSED', 'DELIVERED', 'FAILED', 'DELAYED', 'SENT']
    const status = priority.find((candidate) => events.some((event) => event.status === candidate)) ?? 'SENT'
    await tx.resendInvitationMessage.updateMany({ where: { providerEmailId }, data: { status } })
    if (['COMPLAINED', 'BOUNCED', 'SUPPRESSED', 'FAILED'].includes(status)) {
      const message = await tx.resendInvitationMessage.findUnique({ where: { providerEmailId }, select: { invitation: { select: { id: true, tokenHash: true } } } })
      if (message) {
        const invitationId = message.invitation.id
        const expectedTokenHash = message.invitation.tokenHash
        const reason = status === 'FAILED' ? 'AMBIGUOUS' : 'PERMANENT'
        await tx.invitationEmailRetry.upsert({
          where: { invitationId_expectedTokenHash: { invitationId, expectedTokenHash } },
          create: { invitationId, expectedTokenHash, status: 'REVIEW', reason, dueAt: new Date() },
          update: { status: 'REVIEW', reason },
        })
      }
    }
  }
}
