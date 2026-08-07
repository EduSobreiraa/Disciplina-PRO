import { Injectable } from '@nestjs/common'
import type { TrackerMarkStatus } from '../../../generated/prisma/client.js'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import {
  InvalidTrackerDataError,
  InvalidTrackerBackupError,
  TrackerBehaviorDuplicateError,
  TrackerBehaviorLimitError,
  TrackerBehaviorNotFoundError,
  TrackerContextNotFoundError,
  TrackerFutureDateError,
  TrackerJustificationNotAllowedError,
  TrackerMarkNotFoundError,
} from '../domain/tracker.errors.js'
import { normalizeBehaviorName, trackerDate, trackerRange } from '../domain/tracker-policy.js'
import { TrackerRepository, type TrackerBackupData } from './tracker.repository.js'

const MAX_BACKUP_BEHAVIORS = 100
const MAX_BACKUP_MARKS = 10_000

@Injectable()
export class GetMyTrackerUseCase {
  constructor(private readonly repository: TrackerRepository) {}
  async execute(context: CurrentTenantContext, from: string, to: string) {
    const state = await this.repository.findMine(context, trackerRange(from, to))
    if (!state) throw new TrackerContextNotFoundError()
    return state
  }
}

@Injectable()
export class CreateTrackerBehaviorUseCase {
  constructor(private readonly repository: TrackerRepository) {}
  async execute(context: CurrentTenantContext, name: string) {
    const cleaned = name.trim().replace(/\s+/g, ' ')
    if (!cleaned) throw new InvalidTrackerDataError()
    const result = await this.repository.createBehavior(context, { name: cleaned, normalizedName: normalizeBehaviorName(cleaned) })
    if (result.kind === 'created') return result.behavior
    if (result.kind === 'limit') throw new TrackerBehaviorLimitError()
    if (result.kind === 'duplicate') throw new TrackerBehaviorDuplicateError()
    throw new TrackerContextNotFoundError()
  }
}

@Injectable()
export class RenameTrackerBehaviorUseCase {
  constructor(private readonly repository: TrackerRepository) {}
  async execute(context: CurrentTenantContext, behaviorId: string, name: string) {
    const cleaned = name.trim().replace(/\s+/g, ' ')
    if (!cleaned) throw new InvalidTrackerDataError()
    const result = await this.repository.renameBehavior(context, behaviorId, { name: cleaned, normalizedName: normalizeBehaviorName(cleaned) })
    if (result === 'changed') return
    if (result === 'duplicate') throw new TrackerBehaviorDuplicateError()
    if (result === 'not-found') throw new TrackerBehaviorNotFoundError()
    throw new TrackerContextNotFoundError()
  }
}

@Injectable()
export class ArchiveTrackerBehaviorUseCase {
  constructor(private readonly repository: TrackerRepository) {}
  async execute(context: CurrentTenantContext, behaviorId: string) {
    const result = await this.repository.archiveBehavior(context, behaviorId)
    if (result === 'changed') return
    if (result === 'not-found') throw new TrackerBehaviorNotFoundError()
    throw new TrackerContextNotFoundError()
  }
}

@Injectable()
export class PutTrackerMarkUseCase {
  constructor(private readonly repository: TrackerRepository) {}
  async execute(context: CurrentTenantContext, behaviorId: string, date: string, status: TrackerMarkStatus) {
    const result = await this.repository.putMark(context, behaviorId, trackerDate(date), status)
    if (result === 'changed') return
    if (result === 'future-date') throw new TrackerFutureDateError()
    if (result === 'behavior-not-found') throw new TrackerBehaviorNotFoundError()
    throw new TrackerContextNotFoundError()
  }
}

@Injectable()
export class DeleteTrackerMarkUseCase {
  constructor(private readonly repository: TrackerRepository) {}
  async execute(context: CurrentTenantContext, behaviorId: string, date: string) {
    const result = await this.repository.deleteMark(context, behaviorId, trackerDate(date))
    if (result === 'changed') return
    if (result === 'mark-not-found') throw new TrackerMarkNotFoundError()
    if (result === 'behavior-not-found') throw new TrackerBehaviorNotFoundError()
    throw new TrackerContextNotFoundError()
  }
}

@Injectable()
export class PutTrackerJustificationUseCase {
  constructor(private readonly repository: TrackerRepository) {}
  async execute(context: CurrentTenantContext, behaviorId: string, date: string, text: string) {
    const cleaned = text.trim()
    if (!cleaned) throw new InvalidTrackerDataError()
    const result = await this.repository.putJustification(context, behaviorId, trackerDate(date), cleaned)
    if (result === 'changed') return
    if (result === 'not-failed') throw new TrackerJustificationNotAllowedError()
    if (result === 'mark-not-found') throw new TrackerMarkNotFoundError()
    throw new TrackerContextNotFoundError()
  }
}

@Injectable()
export class ExportTrackerBackupUseCase {
  constructor(private readonly repository: TrackerRepository) {}
  async execute(context: CurrentTenantContext) {
    const data = await this.repository.exportBackup(context)
    if (!data) throw new TrackerContextNotFoundError()
    return {
      type: 'disciplina-pro-tracker',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        behaviors: data.behaviors,
        marks: data.marks.map((mark) => ({ ...mark, trackedOn: mark.trackedOn.toISOString().slice(0, 10) })),
      },
    }
  }
}

interface RestoreTrackerBackupInput {
  type: string
  version: number
  data: {
    behaviors: Array<{ key: string; name: string; position: number; active: boolean }>
    marks: Array<{ behaviorKey: string; trackedOn: string; status: TrackerMarkStatus; justification?: string | null }>
  }
}

@Injectable()
export class RestoreTrackerBackupUseCase {
  constructor(private readonly repository: TrackerRepository) {}

  async execute(context: CurrentTenantContext, input: RestoreTrackerBackupInput) {
    if (input.type !== 'disciplina-pro-tracker' || input.version !== 2) throw new InvalidTrackerBackupError()
    if (input.data.behaviors.length < 1 || input.data.behaviors.length > MAX_BACKUP_BEHAVIORS || input.data.marks.length > MAX_BACKUP_MARKS) throw new InvalidTrackerBackupError()

    const keys = new Set<string>()
    const positions = new Set<number>()
    const activeNames = new Set<string>()
    let activeCount = 0
    const behaviors = input.data.behaviors.map((behavior) => {
      const key = behavior.key.trim()
      const name = behavior.name.trim().replace(/\s+/g, ' ')
      const normalizedName = normalizeBehaviorName(name)
      if (!key || !name || keys.has(key) || positions.has(behavior.position)) throw new InvalidTrackerBackupError()
      if (behavior.active && activeNames.has(normalizedName)) throw new InvalidTrackerBackupError()
      keys.add(key)
      positions.add(behavior.position)
      if (behavior.active) { activeNames.add(normalizedName); activeCount += 1 }
      return { key, name, position: behavior.position, active: behavior.active }
    })
    if (activeCount > 20) throw new InvalidTrackerBackupError()

    const markKeys = new Set<string>()
    const marks = input.data.marks.map((mark) => {
      const behaviorKey = mark.behaviorKey.trim()
      const trackedOn = trackerDate(mark.trackedOn)
      const markKey = `${behaviorKey}:${mark.trackedOn}`
      const justification = mark.justification?.trim() || null
      if (!keys.has(behaviorKey) || markKeys.has(markKey)) throw new InvalidTrackerBackupError()
      if (justification && mark.status !== 'FAILED') throw new InvalidTrackerBackupError()
      markKeys.add(markKey)
      return { behaviorKey, trackedOn, status: mark.status, justification }
    })
    const data: TrackerBackupData = { behaviors, marks }
    const result = await this.repository.restoreBackup(context, data)
    if (result === 'future-date') throw new TrackerFutureDateError()
    if (result === 'context-not-found') throw new TrackerContextNotFoundError()
  }
}
