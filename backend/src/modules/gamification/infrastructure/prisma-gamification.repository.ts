import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import type { InternalEventEnvelope } from '../../events/application/internal-event.contracts.js'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { GamificationRepository, type GamificationView } from '../application/gamification.repository.js'
import { ACHIEVEMENTS, summarizeLevel, unlockedAchievementKeys, type XpRule } from '../domain/gamification-rules.js'

type Transaction = Prisma.TransactionClient

@Injectable()
export class PrismaGamificationRepository extends GamificationRepository<Transaction> {
  constructor(private readonly prisma: PrismaService) { super() }

  async apply(transaction: Transaction, event: InternalEventEnvelope, rule: XpRule): Promise<void> {
    const tenantId = event.tenantId
    const membershipId = this.membershipIdFrom(event)
    if (!tenantId || event.type !== rule.eventType) throw new Error('Evento de gamificação inválido')

    await this.assertSourceExists(transaction, event, tenantId, membershipId)
    await transaction.xpTransaction.createMany({
      data: [{
        tenantId,
        membershipId,
        internalEventId: event.id,
        ruleKey: rule.key,
        eventType: event.type,
        amount: rule.amount,
        description: rule.description,
        occurredAt: event.occurredAt,
      }],
      skipDuplicates: true,
    })

    const aggregate = await transaction.xpTransaction.aggregate({
      where: { tenantId, membershipId },
      _sum: { amount: true },
    })
    const achievementKeys = unlockedAchievementKeys(Math.max(0, aggregate._sum.amount ?? 0), event.type)
    if (achievementKeys.length > 0) {
      await transaction.userAchievement.createMany({
        data: achievementKeys.map((achievementKey) => ({
          tenantId,
          membershipId,
          achievementKey,
          sourceEventId: event.id,
          unlockedAt: event.occurredAt,
        })),
        skipDuplicates: true,
      })
    }
  }

  async findMine(context: CurrentTenantContext): Promise<GamificationView | null> {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        id: context.membershipId,
        tenantId: context.tenantId,
        userId: context.userId,
        status: 'ACTIVE',
        tenant: { status: 'ACTIVE' },
        user: { status: 'ACTIVE' },
      },
      select: { id: true },
    })
    if (!membership) return null

    const scope = { tenantId: context.tenantId, membershipId: membership.id }
    const [aggregate, transactions, achievements] = await Promise.all([
      this.prisma.xpTransaction.aggregate({ where: scope, _sum: { amount: true } }),
      this.prisma.xpTransaction.findMany({
        where: scope,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: 100,
        select: {
          id: true,
          ruleKey: true,
          eventType: true,
          amount: true,
          description: true,
          occurredAt: true,
        },
      }),
      this.prisma.userAchievement.findMany({
        where: scope,
        orderBy: [{ unlockedAt: 'desc' }, { achievementKey: 'asc' }],
        select: { achievementKey: true, unlockedAt: true },
      }),
    ])

    const definitions = new Map<string, (typeof ACHIEVEMENTS)[number]>(ACHIEVEMENTS.map((item) => [item.key, item]))
    return {
      ...summarizeLevel(aggregate._sum.amount ?? 0),
      transactions,
      achievements: achievements.map(({ achievementKey, unlockedAt }) => {
        const definition = definitions.get(achievementKey)
        return {
          key: achievementKey,
          name: definition?.name ?? achievementKey,
          description: definition?.description ?? '',
          unlockedAt,
        }
      }),
    }
  }

  private membershipIdFrom(event: InternalEventEnvelope) {
    const membershipId = event.payload.membershipId
    if (typeof membershipId !== 'string' || membershipId.length === 0) throw new Error('Evento sem membershipId válido')
    return membershipId
  }

  private async assertSourceExists(transaction: Transaction, event: InternalEventEnvelope, tenantId: string, membershipId: string) {
    let source: { id: string } | null = null
    if (event.type === 'execution.activity-completion.recorded.v1') {
      source = await transaction.activityCompletion.findFirst({
        where: { id: event.aggregateId, tenantId, enrollment: { membershipId } },
        select: { id: true },
      })
    } else if (event.type === 'execution.daily-record.submitted.v1') {
      source = await transaction.dailyRecord.findFirst({
        where: { id: event.aggregateId, tenantId, enrollment: { membershipId } },
        select: { id: true },
      })
    } else if (event.type === 'execution.enrollment.completed.v1') {
      source = await transaction.enrollment.findFirst({
        where: { id: event.aggregateId, tenantId, membershipId, status: 'COMPLETED' },
        select: { id: true },
      })
    }
    if (!source) throw new Error('Fato de origem da gamificação não encontrado no tenant')
  }
}
