import { Injectable } from '@nestjs/common'
import type { CurrentPlatformContext } from '../../organizations/application/organization-context.repository.js'
import { normalizeProgramIdentity, normalizeVersionDefinition, type ProgramVersionDefinition } from '../domain/program-policy.js'
import { BundledProgramMaterializationRepository } from './bundled-program-materialization.repository.js'
import { ProgramAdministrationRepository } from './program-administration.repository.js'
import type { BundledProgramState } from './bundled-program-materialization.repository.js'

interface BundledDefinition {
  identity: { slug: string; name: string; summary: string }
  version: ProgramVersionDefinition
}

export class BundledProgramConflictError extends Error {}

@Injectable()
export class MaterializeBundledProgramUseCase {
  constructor(
    private readonly lookup: BundledProgramMaterializationRepository,
    private readonly programs: ProgramAdministrationRepository,
  ) {}

  async execute(context: CurrentPlatformContext, input: BundledDefinition & { previous?: BundledDefinition }) {
    const identity = normalizeProgramIdentity(input.identity)
    const definition = normalizeVersionDefinition(input.version, true)
    const current = await this.lookup.findBySlug(identity.slug)
    if (!current) {
      const draft = await this.programs.create({
        actorPlatformAccessId: context.platformAccessId,
        identity,
        definition,
        now: new Date(),
      })
      const published = await this.programs.publish({
        actorPlatformAccessId: context.platformAccessId,
        versionId: draft.id,
        now: new Date(),
      })
      return { action: 'CREATED_AND_PUBLISHED' as const, programId: published.programId, versionId: published.id }
    }
    if (input.previous && current.published && (
      current.name !== identity.name || current.summary !== identity.summary || !this.sameDefinition(current.published, definition)
    )) {
      return this.upgrade(context, current, { identity, version: definition }, input.previous)
    }
    if (current.name !== identity.name || current.summary !== identity.summary) {
      throw new BundledProgramConflictError('Identidade do programa existente diverge da definição embarcada')
    }
    if (current.published) {
      if (!this.sameDefinition(current.published, definition)) {
        throw new BundledProgramConflictError('Versão publicada diverge da definição embarcada')
      }
      return { action: 'UNCHANGED' as const, programId: current.id, versionId: current.published.id }
    }
    if (!current.draft || !this.sameDefinition(current.draft, definition)) {
      throw new BundledProgramConflictError('Draft existente diverge da definição embarcada')
    }
    const published = await this.programs.publish({
      actorPlatformAccessId: context.platformAccessId,
      versionId: current.draft.id,
      now: new Date(),
    })
    return { action: 'PUBLISHED_EXISTING_DRAFT' as const, programId: current.id, versionId: published.id }
  }

  private async upgrade(context: CurrentPlatformContext, current: BundledProgramState, next: BundledDefinition, previous: BundledDefinition) {
    const oldIdentity = normalizeProgramIdentity(previous.identity)
    const oldDefinition = normalizeVersionDefinition(previous.version, true)
    const matchesIdentity = (identity: BundledDefinition['identity']) =>
      current.slug === identity.slug && current.name === identity.name && current.summary === identity.summary
    if (oldIdentity.slug !== next.identity.slug || (!matchesIdentity(oldIdentity) && !matchesIdentity(next.identity)) || !current.published) {
      throw new BundledProgramConflictError('Identidade não corresponde à transição embarcada')
    }
    const alreadyPublished = this.sameDefinition(current.published, next.version)
    if (!alreadyPublished && !this.sameDefinition(current.published, oldDefinition)) {
      throw new BundledProgramConflictError('Versão publicada não corresponde à transição embarcada')
    }
    if (!alreadyPublished && current.draft && !this.sameDefinition(current.draft, oldDefinition) && !this.sameDefinition(current.draft, next.version)) {
      throw new BundledProgramConflictError('Draft existente diverge da transição embarcada')
    }
    const actor = { actorPlatformAccessId: context.platformAccessId, now: new Date() }
    let published = current.published
    if (!alreadyPublished) {
      const draft = current.draft ?? await this.programs.createVersion({ ...actor, programId: current.id })
      if (!this.sameDefinition(draft, next.version)) {
        await this.programs.replaceDraft({ ...actor, versionId: draft.id, definition: next.version })
      }
      published = await this.programs.publish({ ...actor, versionId: draft.id })
    }
    // Identity is updated last; retries can finish it after a successful publication.
    await this.programs.updateProgram({ ...actor, programId: current.id, identity: next.identity })
    return { action: 'UPGRADED_AND_PUBLISHED' as const, programId: current.id, versionId: published.id }
  }

  private sameDefinition(current: ProgramVersionDefinition, expected: ProgramVersionDefinition) {
    const comparable = ({ title, description, durationDays, executionConfiguration, phases }: ProgramVersionDefinition) => ({
      title,
      description,
      durationDays,
      executionConfiguration,
      phases,
    })
    return JSON.stringify(this.canonical(comparable(current))) === JSON.stringify(this.canonical(comparable(expected)))
  }

  private canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.canonical(item))
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, this.canonical(item)]),
      )
    }
    return value
  }
}
