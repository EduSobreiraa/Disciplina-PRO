import type { ProgramVersionDefinition } from '../domain/program-policy.js'

export interface ProgramView {
  id: string
  slug: string
  name: string
  summary: string
  status: 'ACTIVE' | 'ARCHIVED'
  archivedAt: Date | null
}

export interface ProgramVersionView extends ProgramVersionDefinition {
  id: string
  programId: string
  versionNumber: number
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt: Date | null
  archivedAt: Date | null
}

export abstract class ProgramAdministrationRepository {
  abstract create(input: { actorPlatformAccessId: string; identity: { slug: string; name: string; summary: string }; definition: ProgramVersionDefinition; now: Date }): Promise<ProgramVersionView>
  abstract updateProgram(input: { actorPlatformAccessId: string; programId: string; identity: { slug: string; name: string; summary: string }; now: Date }): Promise<ProgramView>
  abstract replaceDraft(input: { actorPlatformAccessId: string; versionId: string; definition: ProgramVersionDefinition; now: Date }): Promise<ProgramVersionView>
  abstract createVersion(input: { actorPlatformAccessId: string; programId: string; now: Date }): Promise<ProgramVersionView>
  abstract publish(input: { actorPlatformAccessId: string; versionId: string; now: Date }): Promise<ProgramVersionView>
  abstract archive(input: { actorPlatformAccessId: string; programId: string; now: Date }): Promise<ProgramView>
}
