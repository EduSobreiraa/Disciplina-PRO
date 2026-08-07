import { Injectable } from '@nestjs/common'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { isRitualItem } from '../domain/ritual-definition.js'
import {
  InvalidRitualItemError,
  RitualContextNotFoundError,
  RitualFutureDateError,
  RitualTimerDateError,
} from '../domain/ritual.errors.js'
import { ritualDate, ritualRange } from '../domain/ritual-policy.js'
import { RitualClock } from './ritual-clock.js'
import { RitualRepository, type RitualChangeResult, type RitualDayView } from './ritual.repository.js'

function toResponse(day: RitualDayView) {
  return { ...day, date: day.date.toISOString().slice(0, 10) }
}

function unwrap(result: RitualChangeResult) {
  if (result.kind === 'changed') return toResponse(result.day)
  if (result.kind === 'future-date') throw new RitualFutureDateError()
  if (result.kind === 'timer-date') throw new RitualTimerDateError()
  throw new RitualContextNotFoundError()
}

@Injectable()
export class GetMyRitualUseCase {
  constructor(private readonly repository: RitualRepository, private readonly clock: RitualClock) {}
  async execute(context: CurrentTenantContext, from: string, to: string) {
    const days = await this.repository.findMine(context, ritualRange(from, to), this.clock.now())
    if (!days) throw new RitualContextNotFoundError()
    return { days: days.map(toResponse) }
  }
}

@Injectable()
export class SetRitualCheckUseCase {
  constructor(private readonly repository: RitualRepository, private readonly clock: RitualClock) {}
  async execute(context: CurrentTenantContext, date: string, sectionKey: string, itemKey: string, completed: boolean) {
    if (!isRitualItem(sectionKey, itemKey)) throw new InvalidRitualItemError()
    return unwrap(await this.repository.setCheck(context, ritualDate(date), sectionKey, itemKey, completed, this.clock.now()))
  }
}

@Injectable()
export class ChangeRitualTimerUseCase {
  constructor(private readonly repository: RitualRepository, private readonly clock: RitualClock) {}
  execute(context: CurrentTenantContext, date: string, action: 'start' | 'pause' | 'reset') {
    return this.repository.changeTimer(context, ritualDate(date), action, this.clock.now()).then(unwrap)
  }
}
