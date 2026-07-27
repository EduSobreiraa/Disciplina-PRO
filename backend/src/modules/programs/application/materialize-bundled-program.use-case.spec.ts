import { jest } from '@jest/globals'
import type { CurrentPlatformContext } from '../../organizations/application/organization-context.repository.js'
import { PROJETO66_CATALOG } from '../catalog/projeto66.definition.js'
import { normalizeVersionDefinition } from '../domain/program-policy.js'
import type { BundledProgramMaterializationRepository, BundledProgramState } from './bundled-program-materialization.repository.js'
import { BundledProgramConflictError, MaterializeBundledProgramUseCase } from './materialize-bundled-program.use-case.js'
import type { ProgramAdministrationRepository, ProgramVersionView } from './program-administration.repository.js'

describe('MaterializeBundledProgramUseCase', () => {
  const context: CurrentPlatformContext = {
    platformAccessId: '019f0000-0000-7000-8000-000000000001',
    userId: '019f0000-0000-7000-8000-000000000002',
    platformRole: 'SUPER_ADMIN',
  }
  const definition = normalizeVersionDefinition(PROJETO66_CATALOG.version, true)
  const version: ProgramVersionView = {
    ...definition,
    id: '019f0000-0000-7000-8000-000000000003',
    programId: '019f0000-0000-7000-8000-000000000004',
    versionNumber: 1,
    status: 'PUBLISHED',
    publishedAt: new Date(),
    archivedAt: null,
  }

  function setup(state: BundledProgramState | null) {
    const findBySlug = jest.fn<BundledProgramMaterializationRepository['findBySlug']>().mockResolvedValue(state)
    const create = jest.fn<ProgramAdministrationRepository['create']>().mockResolvedValue({ ...version, status: 'DRAFT', publishedAt: null })
    const publish = jest.fn<ProgramAdministrationRepository['publish']>().mockResolvedValue(version)
    const programs = { create, publish } as unknown as ProgramAdministrationRepository
    return {
      useCase: new MaterializeBundledProgramUseCase({ findBySlug }, programs),
      create,
      publish,
    }
  }

  it('creates and publishes only when the slug is absent', async () => {
    const { useCase, create, publish } = setup(null)
    await expect(useCase.execute(context, PROJETO66_CATALOG)).resolves.toMatchObject({ action: 'CREATED_AND_PUBLISHED' })
    expect(create).toHaveBeenCalledTimes(1)
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ versionId: version.id }))
  })

  it('is idempotent for the same published definition', async () => {
    const { useCase, create, publish } = setup({
      id: version.programId,
      ...PROJETO66_CATALOG.identity,
      published: version,
      draft: null,
    })
    await expect(useCase.execute(context, PROJETO66_CATALOG)).resolves.toMatchObject({ action: 'UNCHANGED' })
    expect(create).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
  })

  it('refuses to mutate a divergent publication', async () => {
    const { useCase, create, publish } = setup({
      id: version.programId,
      ...PROJETO66_CATALOG.identity,
      published: { ...version, durationDays: 65 },
      draft: null,
    })
    await expect(useCase.execute(context, PROJETO66_CATALOG)).rejects.toBeInstanceOf(BundledProgramConflictError)
    expect(create).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
  })
})
