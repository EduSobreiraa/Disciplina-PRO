import { Injectable } from '@nestjs/common'
import type { CurrentPlatformContext } from '../../organizations/application/organization-context.repository.js'
import { normalizeProgramIdentity, normalizeVersionDefinition, type ProgramVersionDefinition } from '../domain/program-policy.js'
import { ProgramAdministrationRepository } from './program-administration.repository.js'

@Injectable()
export class CreateProgramUseCase {
  constructor(private readonly programs: ProgramAdministrationRepository) {}
  execute(context: CurrentPlatformContext, input: { slug: string; name: string; summary: string; version: ProgramVersionDefinition }) {
    return this.programs.create({ actorPlatformAccessId: context.platformAccessId, identity: normalizeProgramIdentity(input), definition: normalizeVersionDefinition(input.version), now: new Date() })
  }
}

@Injectable()
export class UpdateProgramUseCase {
  constructor(private readonly programs: ProgramAdministrationRepository) {}
  execute(context: CurrentPlatformContext, programId: string, input: { slug: string; name: string; summary: string }) {
    return this.programs.updateProgram({ actorPlatformAccessId: context.platformAccessId, programId, identity: normalizeProgramIdentity(input), now: new Date() })
  }
}

@Injectable()
export class ReplaceProgramDraftUseCase {
  constructor(private readonly programs: ProgramAdministrationRepository) {}
  execute(context: CurrentPlatformContext, versionId: string, input: ProgramVersionDefinition) {
    return this.programs.replaceDraft({ actorPlatformAccessId: context.platformAccessId, versionId, definition: normalizeVersionDefinition(input), now: new Date() })
  }
}

@Injectable()
export class CreateProgramVersionUseCase {
  constructor(private readonly programs: ProgramAdministrationRepository) {}
  execute(context: CurrentPlatformContext, programId: string) {
    return this.programs.createVersion({ actorPlatformAccessId: context.platformAccessId, programId, now: new Date() })
  }
}

@Injectable()
export class PublishProgramVersionUseCase {
  constructor(private readonly programs: ProgramAdministrationRepository) {}
  execute(context: CurrentPlatformContext, versionId: string) {
    return this.programs.publish({ actorPlatformAccessId: context.platformAccessId, versionId, now: new Date() })
  }
}

@Injectable()
export class ArchiveProgramUseCase {
  constructor(private readonly programs: ProgramAdministrationRepository) {}
  execute(context: CurrentPlatformContext, programId: string) {
    return this.programs.archive({ actorPlatformAccessId: context.platformAccessId, programId, now: new Date() })
  }
}
