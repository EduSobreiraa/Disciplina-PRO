import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../database/prisma.service.js'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { calculateMissionMetrics, civilDateKey, type MissionMetrics } from '../domain/mission-metrics.js'
import { MissionsRepository } from '../application/missions.repository.js'

@Injectable()
export class PrismaMissionsRepository extends MissionsRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  async findMine(context: CurrentTenantContext, now: Date): Promise<MissionMetrics | null> {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { id: context.membershipId, tenantId: context.tenantId, userId: context.userId, status: 'ACTIVE', tenant: { status: 'ACTIVE' }, user: { status: 'ACTIVE' } },
      select: { id: true, tenant: { select: { timeZone: true } } },
    })
    if (!membership) return null

    const today = civilDateKey(now, membership.tenant.timeZone)
    const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00.000Z`)
    const nextMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1))
    const scope = { tenantId: context.tenantId, membershipId: membership.id }
    const xpWindowStart = new Date(now.getTime() - 8 * 86_400_000)
    const xpWindowEnd = new Date(now.getTime() + 2 * 86_400_000)

    const [behaviors, monthMarks, totalGreens, ritualSectionCounts, xpTransactions] = await Promise.all([
      this.prisma.trackerBehavior.findMany({ where: { ...scope, active: true }, select: { id: true } }),
      this.prisma.trackerMark.findMany({
        where: { ...scope, trackedOn: { gte: monthStart, lt: nextMonth } },
        select: { behaviorId: true, trackedOn: true, status: true },
      }),
      this.prisma.trackerMark.count({ where: { ...scope, status: 'COMPLETED' } }),
      this.prisma.ritualCheck.groupBy({
        by: ['ritualDayId', 'sectionKey'],
        where: scope,
        _count: { itemKey: true },
      }),
      this.prisma.xpTransaction.findMany({
        where: { ...scope, amount: { gt: 0 }, occurredAt: { gte: xpWindowStart, lt: xpWindowEnd } },
        select: { amount: true, occurredAt: true },
      }),
    ])

    return calculateMissionMetrics({
      activeBehaviorIds: behaviors.map(({ id }) => id),
      monthMarks,
      totalGreens,
      ritualSectionCounts: ritualSectionCounts.map(({ sectionKey, _count }) => ({ sectionKey, count: _count.itemKey })),
      xpTransactions,
      today,
      timeZone: membership.tenant.timeZone,
    })
  }
}
