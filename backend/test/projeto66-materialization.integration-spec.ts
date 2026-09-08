import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { MaterializeBundledProgramUseCase } from '../src/modules/programs/application/materialize-bundled-program.use-case.js'
import { PROJETO66_CATALOG, PROJETO66_REQUIRED_ACTIVITY_KEYS } from '../src/modules/programs/catalog/projeto66.definition.js'
import type { CurrentPlatformContext } from '../src/modules/organizations/application/organization-context.repository.js'

describe('Projeto 77 catalog materialization integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let context: CurrentPlatformContext

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const user = await prisma.user.create({
      data: {
        email: `projeto66-materializer-${suffix}@test.invalid`,
        normalizedEmail: `projeto66-materializer-${suffix}@test.invalid`,
        passwordHash: 'integration',
      },
    })
    const access = await prisma.platformAccess.create({ data: { userId: user.id } })
    context = {
      platformAccessId: access.id,
      userId: user.id,
      platformRole: access.role,
    }
  })

  afterAll(async () => app.close())

  it('publishes exactly one compatible definition and remains idempotent', async () => {
    const materialize = app.get(MaterializeBundledProgramUseCase)
    const first = await materialize.execute(context, PROJETO66_CATALOG)
    expect(['CREATED_AND_PUBLISHED', 'UNCHANGED']).toContain(first.action)
    await expect(materialize.execute(context, PROJETO66_CATALOG))
      .resolves.toMatchObject({ action: 'UNCHANGED', programId: first.programId, versionId: first.versionId })

    const program = await prisma.program.findUniqueOrThrow({
      where: { slug: PROJETO66_CATALOG.identity.slug },
      include: {
        versions: {
          include: { activities: { orderBy: { key: 'asc' } } },
        },
      },
    })
    expect(program.versions).toHaveLength(1)
    expect(program.versions[0]).toMatchObject({ status: 'PUBLISHED', durationDays: 77 })
    expect(program.versions[0]?.activities.map(({ key }) => key).sort())
      .toEqual([...PROJETO66_REQUIRED_ACTIVITY_KEYS].sort())
    expect(await prisma.auditEvent.count({
      where: { entityId: program.id, action: 'PROGRAM_CREATED' },
    })).toBe(1)
    expect(await prisma.auditEvent.count({
      where: { entityId: program.id, action: 'PROGRAM_VERSION_PUBLISHED' },
    })).toBe(1)
  })

  it('upgrades the exact 66-day predecessor without rewriting its activities or duration', async () => {
    const slug = `projeto77-upgrade-${Date.now()}`
    const previous = {
      ...PROJETO66_CATALOG.previous,
      identity: { ...PROJETO66_CATALOG.previous.identity, slug },
    }
    const next = {
      ...PROJETO66_CATALOG,
      identity: { ...PROJETO66_CATALOG.identity, slug },
      previous,
    }
    const materialize = app.get(MaterializeBundledProgramUseCase)
    const original = await materialize.execute(context, previous)
    const activitiesBefore = await prisma.programActivity.findMany({ where: { programVersionId: original.versionId }, orderBy: { key: 'asc' } })
    const result = await materialize.execute(context, next)
    expect(result.action).toBe('UPGRADED_AND_PUBLISHED')
    expect(result.programId).toBe(original.programId)
    expect(result.versionId).not.toBe(original.versionId)
    expect(await prisma.programVersion.findUniqueOrThrow({ where: { id: original.versionId } }))
      .toMatchObject({ durationDays: 66, status: 'ARCHIVED' })
    expect(await prisma.programActivity.findMany({ where: { programVersionId: original.versionId }, orderBy: { key: 'asc' } }))
      .toEqual(activitiesBefore)
    expect(await prisma.programVersion.findUniqueOrThrow({ where: { id: result.versionId } }))
      .toMatchObject({ durationDays: 77, status: 'PUBLISHED', versionNumber: 2 })
    expect(await prisma.program.findUniqueOrThrow({ where: { id: original.programId } }))
      .toMatchObject({ name: 'Projeto 77', slug })
    await expect(materialize.execute(context, next)).resolves.toMatchObject({ action: 'UNCHANGED', versionId: result.versionId })
    expect(await prisma.programVersion.count({ where: { programId: original.programId } })).toBe(2)
  })

})
