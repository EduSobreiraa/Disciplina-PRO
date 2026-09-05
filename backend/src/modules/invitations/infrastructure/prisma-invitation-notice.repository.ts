import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../database/prisma.service.js'
import { InvitationNoticeRepository } from '../application/invitation-notice.js'

@Injectable()
export class PrismaInvitationNoticeRepository extends InvitationNoticeRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  async reviewInterrupted(now: Date) {
    await this.prisma.invitationEmailRetry.updateMany({ where: { noticeStatus: 'CLAIMED', noticeClaimedAt: { lt: new Date(now.getTime() - 5 * 60_000) } }, data: { noticeStatus: 'UNCERTAIN' } })
  }

  findPending() {
    return this.prisma.invitationEmailRetry.findMany({ where: { status: 'REVIEW', noticeStatus: 'PENDING' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 10, select: { id: true } })
  }

  claim(id: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.invitationEmailRetry.updateMany({ where: { id, status: 'REVIEW', noticeStatus: 'PENDING' }, data: { noticeStatus: 'CLAIMED', noticeClaimedAt: now } })
      if (!claimed.count) return null
      const job = await tx.invitationEmailRetry.findUniqueOrThrow({ where: { id }, include: { invitation: { include: { tenant: true, createdByPlatformAccess: { include: { user: true } } } } } })
      const invitation = job.invitation
      const ceo = invitation.tenant.status === 'ACTIVE' ? await tx.tenantMembership.findFirst({ where: { tenantId: invitation.tenantId, role: 'CEO', status: 'ACTIVE', user: { status: 'ACTIVE' } }, orderBy: { id: 'asc' }, select: { user: { select: { email: true } } } }) : null
      const platform = invitation.createdByPlatformAccess
      const initialCeo = invitation.role === 'CEO' && ['PENDING', 'ACTIVE'].includes(invitation.tenant.status) && platform?.status === 'ACTIVE' && platform.user.status === 'ACTIVE'
      const email = ceo?.user.email ?? (initialCeo ? platform.user.email : undefined)
      const suppressed = email ? await tx.resendInvitationMessage.findFirst({ where: { invitation: { normalizedEmail: email.trim().toLowerCase() }, status: { in: ['BOUNCED', 'COMPLAINED', 'SUPPRESSED'] } }, select: { providerEmailId: true } }) : null
      if (!email || suppressed) {
        await tx.invitationEmailRetry.update({ where: { id }, data: { noticeStatus: 'BLOCKED' } })
        return null
      }
      return { id, invitationId: invitation.id, email }
    })
  }

  async finish(id: string, status: 'SENT' | 'FAILED' | 'BLOCKED' | 'UNCERTAIN') {
    await this.prisma.invitationEmailRetry.updateMany({ where: { id, noticeStatus: 'CLAIMED' }, data: { noticeStatus: status } })
  }
}
