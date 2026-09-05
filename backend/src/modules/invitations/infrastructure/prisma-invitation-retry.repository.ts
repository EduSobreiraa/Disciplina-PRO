import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../database/prisma.service.js'
import { InvitationRetryRepository, type InvitationRetryCandidate } from '../application/invitation-retry.repository.js'

@Injectable()
export class PrismaInvitationRetryRepository extends InvitationRetryRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  async reviewInterrupted(now: Date) {
    const result = await this.prisma.invitationEmailRetry.updateMany({ where: { status: 'CLAIMED', claimedAt: { lt: new Date(now.getTime() - 5 * 60_000) } }, data: { status: 'REVIEW', reason: 'INTERRUPTED' } })
    return result.count
  }

  findDue(now: Date) {
    return this.prisma.invitationEmailRetry.findMany({ where: { status: 'PENDING', dueAt: { lte: now } }, orderBy: { dueAt: 'asc' }, take: 10, select: { id: true, invitationId: true } })
  }

  claim(candidate: InvitationRetryCandidate, tokenHash: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM invitations WHERE id = ${candidate.invitationId}::uuid FOR UPDATE`
      const job = await tx.invitationEmailRetry.findUniqueOrThrow({ where: { id: candidate.id } })
      if (job.status !== 'PENDING' || job.dueAt > now) return null
      const invitation = await tx.invitation.findUniqueOrThrow({ where: { id: job.invitationId }, include: { tenant: { select: { status: true } } } })
      const suppressed = await tx.resendInvitationMessage.findFirst({ where: { invitation: { normalizedEmail: invitation.normalizedEmail }, status: { in: ['BOUNCED', 'COMPLAINED', 'SUPPRESSED'] } }, select: { providerEmailId: true } })
      if (invitation.status !== 'PENDING' || invitation.expiresAt <= now || invitation.tokenHash !== job.expectedTokenHash || invitation.tenant.status !== 'ACTIVE' || suppressed) {
        await tx.invitationEmailRetry.update({ where: { id: job.id }, data: { status: 'CANCELLED' } })
        return 'cancelled' as const
      }
      await tx.invitation.update({ where: { id: invitation.id }, data: { tokenHash } })
      await tx.invitationEmailRetry.update({ where: { id: job.id }, data: { status: 'CLAIMED', claimedAt: now } })
      return { invitationId: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt, retryJobId: job.id }
    })
  }

  async finish(id: string, sent: boolean) {
    await this.prisma.invitationEmailRetry.updateMany({ where: { id, status: 'CLAIMED' }, data: { status: sent ? 'SENT' : 'REVIEW', ...(sent ? {} : { reason: 'EXHAUSTED' }) } })
  }
}
