import { Injectable } from '@nestjs/common'
import type { CurrentPlatformContext } from '../../organizations/application/organization-context.repository.js'
import { normalizeProgramIdentity, normalizeVersionDefinition, type ProgramVersionDefinition } from '../domain/program-policy.js'
import { BundledProgramMaterializationRepository } from './bundled-program-materialization.repository.js'
import { ProgramAdministrationRepository } from './program-administration.repository.js'

export class BundledProgramConflictError extends Error {}

@Injectable()
export class MaterializeBundledProgramUseCase {
  constructor(
    private readonly lookup: BundledProgramMaterializationRepository,
    private readonly programs: ProgramAdministrationRepository,
  ) {}

  async execute(context: CurrentPlatformContext, input: {
    identity: { slug: string; name: string; summary: string }
    version: ProgramVersionDefinition
  }) {
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
