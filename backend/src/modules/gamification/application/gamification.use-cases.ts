import { Injectable, OnModuleInit } from '@nestjs/common'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import type { InternalEventEnvelope } from '../../events/application/internal-event.contracts.js'
import { InternalEventConsumerRegistry, type InternalEventConsumer } from '../../events/application/internal-event-consumer.js'
import { XP_RULES, ruleFor } from '../domain/gamification-rules.js'
import { GamificationRepository } from './gamification.repository.js'

export const GAMIFICATION_CONSUMER = 'gamification'

@Injectable()
export class GamificationInternalEventConsumer implements InternalEventConsumer, OnModuleInit {
  readonly name = GAMIFICATION_CONSUMER
  readonly supportedEvents = XP_RULES.map(({ eventType }) => ({ type: eventType, version: 1 }))

  constructor(
    private readonly registry: InternalEventConsumerRegistry,
    private readonly repository: GamificationRepository,
  ) {}

  onModuleInit() {
    this.registry.register(this)
  }

  async handle(event: InternalEventEnvelope, transaction: unknown) {
    const rule = ruleFor(event.type, event.version)
    if (!rule) throw Object.assign(new Error('Regra de gamificação incompatível'), { code: 'GAMIFICATION_EVENT_UNSUPPORTED' })
    await this.repository.apply(transaction, event, rule)
  }
}

@Injectable()
export class GetMyGamificationUseCase {
  constructor(private readonly repository: GamificationRepository) {}

  async execute(context: CurrentTenantContext) {
    return (await this.repository.findMine(context)) ?? {
      balance: 0,
      level: { level: 1, key: 'recruit', name: 'Recruta', minimum: 0 },
      nextLevel: { level: 2, key: 'soldier', name: 'Soldado', minimum: 500 },
      progress: 0,
      transactions: [],
      achievements: [],
    }
  }
}

