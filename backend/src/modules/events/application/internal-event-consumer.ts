import { Injectable } from '@nestjs/common'
import type { InternalEventEnvelope } from './internal-event.contracts.js'

export interface SupportedInternalEvent {
  type: string
  version: number
}

export interface InternalEventConsumer<TTransaction = unknown> {
  readonly name: string
  readonly supportedEvents: readonly SupportedInternalEvent[]
  handle(event: InternalEventEnvelope, transaction: TTransaction): Promise<void>
}

@Injectable()
export class InternalEventConsumerRegistry {
  private readonly consumers = new Map<string, InternalEventConsumer>()

  register(consumer: InternalEventConsumer) {
    if (!consumer.name.trim() || this.consumers.has(consumer.name)) {
      throw new Error('INTERNAL_EVENT_CONSUMER_INVALID')
    }
    this.consumers.set(consumer.name, consumer)
  }

  all() {
    return [...this.consumers.values()]
  }

  get(name: string) {
    return this.consumers.get(name)
  }
}

