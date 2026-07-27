import type { ProgramVersionView } from './program-administration.repository.js'

export interface BundledProgramState {
  id: string
  slug: string
  name: string
  summary: string
  published: ProgramVersionView | null
  draft: ProgramVersionView | null
}

export abstract class BundledProgramMaterializationRepository {
  abstract findBySlug(slug: string): Promise<BundledProgramState | null>
}
