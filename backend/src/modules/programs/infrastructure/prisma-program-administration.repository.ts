import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import { ProgramAdministrationRepository, type ProgramVersionView } from '../application/program-administration.repository.js'
import { InvalidProgramDataError, InvalidProgramTransitionError, PlatformProgramActorInactiveError, ProgramDraftAlreadyExistsError, ProgramNotFoundError, ProgramSlugAlreadyExistsError, ProgramVersionNotPublishableError } from '../domain/program.errors.js'
import { normalizeVersionDefinition, type ProgramVersionDefinition } from '../domain/program-policy.js'

@Injectable()
export class PrismaProgramAdministrationRepository extends ProgramAdministrationRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  list() {
    return this.prisma.program.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, select: { id: true, versionNumber: true, status: true, publishedAt: true } },
        tenantPrograms: { orderBy: { tenantId: 'asc' }, select: { tenantId: true, status: true, enabledAt: true, disabledAt: true } },
      },
    })
  }

  create(input: { actorPlatformAccessId: string; identity: { slug: string; name: string; summary: string }; definition: ProgramVersionDefinition; now: Date }) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertActor(tx, input.actorPlatformAccessId)
      try {
        const program = await tx.program.create({ data: { ...input.identity, createdAt: input.now } })
        const version = await tx.programVersion.create({
          data: { programId: program.id, versionNumber: 1, title: input.definition.title, description: input.definition.description, durationDays: input.definition.durationDays, executionConfiguration: input.definition.executionConfiguration as Prisma.InputJsonValue, createdAt: input.now, phases: this.phaseCreate(input.definition) },
        })
        await this.audit(tx, input.actorPlatformAccessId, 'PROGRAM_CREATED', program.id, { slug: program.slug, versionId: version.id, versionNumber: 1 })
        return this.findVersion(tx, version.id)
      } catch (error) {
        if (this.isUnique(error)) throw new ProgramSlugAlreadyExistsError()
        throw error
      }
    })
  }

  updateProgram(input: { actorPlatformAccessId: string; programId: string; identity: { slug: string; name: string; summary: string }; now: Date }) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertActor(tx, input.actorPlatformAccessId)
      const program = await this.lockProgram(tx, input.programId)
      if (program.status !== 'ACTIVE') throw new InvalidProgramTransitionError()
      try {
        const updated = await tx.program.update({ where: { id: program.id }, data: input.identity })
        await this.audit(tx, input.actorPlatformAccessId, 'PROGRAM_UPDATED', program.id, { slug: updated.slug })
        return updated
      } catch (error) {
        if (this.isUnique(error)) throw new ProgramSlugAlreadyExistsError()
        throw error
      }
    })
  }

  replaceDraft(input: { actorPlatformAccessId: string; versionId: string; definition: ProgramVersionDefinition; now: Date }) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertActor(tx, input.actorPlatformAccessId)
      const target = await tx.programVersion.findUnique({ where: { id: input.versionId }, select: { id: true, programId: true } })
      if (!target) throw new ProgramNotFoundError()
      const program = await this.lockProgram(tx, target.programId)
      const current = await tx.programVersion.findUniqueOrThrow({ where: { id: target.id }, select: { id: true, status: true } })
      if (program.status !== 'ACTIVE' || current.status !== 'DRAFT') throw new InvalidProgramTransitionError()
      await tx.programActivity.deleteMany({ where: { programVersionId: current.id } })
      await tx.programPhase.deleteMany({ where: { programVersionId: current.id } })
      await tx.programVersion.update({
        where: { id: current.id },
        data: { title: input.definition.title, description: input.definition.description, durationDays: input.definition.durationDays, executionConfiguration: input.definition.executionConfiguration as Prisma.InputJsonValue, phases: this.phaseCreate(input.definition) },
      })
      await this.audit(tx, input.actorPlatformAccessId, 'PROGRAM_VERSION_UPDATED', program.id, { versionId: current.id, phaseCount: input.definition.phases.length, activityCount: this.activityCount(input.definition) })
      return this.findVersion(tx, current.id)
    })
  }

  createVersion(input: { actorPlatformAccessId: string; programId: string; now: Date }) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertActor(tx, input.actorPlatformAccessId)
      const program = await this.lockProgram(tx, input.programId)
      if (program.status !== 'ACTIVE') throw new InvalidProgramTransitionError()
      if (await tx.programVersion.findFirst({ where: { programId: program.id, status: 'DRAFT' } })) throw new ProgramDraftAlreadyExistsError()
      const published = await tx.programVersion.findFirst({
        where: { programId: program.id, status: 'PUBLISHED' },
        include: { phases: { orderBy: { position: 'asc' }, include: { activities: { orderBy: { position: 'asc' } } } } },
      })
      if (!published) throw new InvalidProgramTransitionError()
      const maximum = await tx.programVersion.aggregate({ where: { programId: program.id }, _max: { versionNumber: true } })
      try {
        const version = await tx.programVersion.create({
          data: {
            programId: program.id,
            versionNumber: (maximum._max.versionNumber ?? 0) + 1,
            title: published.title,
            description: published.description,
            durationDays: published.durationDays,
            executionConfiguration: published.executionConfiguration as Prisma.InputJsonValue,
            createdAt: input.now,
            phases: { create: published.phases.map((phase) => ({ key: phase.key, title: phase.title, description: phase.description, position: phase.position, activities: { create: phase.activities.map((activity) => ({ key: activity.key, title: activity.title, description: activity.description, position: activity.position, type: activity.type, frequency: activity.frequency, configuration: activity.configuration as Prisma.InputJsonValue })) } })) },
          },
        })
        await this.audit(tx, input.actorPlatformAccessId, 'PROGRAM_VERSION_CREATED', program.id, { sourceVersionId: published.id, versionId: version.id, versionNumber: version.versionNumber })
        return this.findVersion(tx, version.id)
      } catch (error) {
        if (this.isUnique(error)) throw new ProgramDraftAlreadyExistsError()
        throw error
      }
    })
  }

  publish(input: { actorPlatformAccessId: string; versionId: string; now: Date }) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertActor(tx, input.actorPlatformAccessId)
      const target = await tx.programVersion.findUnique({ where: { id: input.versionId }, select: { id: true, programId: true } })
      if (!target) throw new ProgramNotFoundError()
      const program = await this.lockProgram(tx, target.programId)
      const draft = await tx.programVersion.findUniqueOrThrow({
        where: { id: target.id },
        include: { phases: { orderBy: { position: 'asc' }, include: { activities: { orderBy: { position: 'asc' } } } } },
      })
      if (program.status !== 'ACTIVE' || draft.status !== 'DRAFT') throw new InvalidProgramTransitionError()
      const definition = this.definition(draft)
      try { normalizeVersionDefinition(definition, true) } catch (error) {
        if (error instanceof InvalidProgramDataError || error instanceof ProgramVersionNotPublishableError) throw new ProgramVersionNotPublishableError()
        throw error
      }
      const previous = await tx.programVersion.findFirst({ where: { programId: program.id, status: 'PUBLISHED' } })
      if (previous) await tx.programVersion.update({ where: { id: previous.id }, data: { status: 'ARCHIVED', archivedAt: input.now } })
      await tx.programVersion.update({ where: { id: draft.id }, data: { status: 'PUBLISHED', publishedAt: input.now } })
      await this.audit(tx, input.actorPlatformAccessId, 'PROGRAM_VERSION_PUBLISHED', program.id, { versionId: draft.id, versionNumber: draft.versionNumber, previousVersionId: previous?.id ?? null, phaseCount: definition.phases.length, activityCount: this.activityCount(definition) })
      return this.findVersion(tx, draft.id)
    })
  }

  archive(input: { actorPlatformAccessId: string; programId: string; now: Date }) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertActor(tx, input.actorPlatformAccessId)
      const program = await this.lockProgram(tx, input.programId)
      if (program.status !== 'ACTIVE') throw new InvalidProgramTransitionError()
      const updated = await tx.program.update({ where: { id: program.id }, data: { status: 'ARCHIVED', archivedAt: input.now } })
      await this.audit(tx, input.actorPlatformAccessId, 'PROGRAM_ARCHIVED', program.id, {})
      return updated
    })
  }

  private phaseCreate(definition: ProgramVersionDefinition): Prisma.ProgramPhaseCreateNestedManyWithoutProgramVersionInput {
    return { create: definition.phases.map((phase) => ({ key: phase.key, title: phase.title, description: phase.description, position: phase.position, activities: { create: phase.activities.map((activity) => ({ ...activity, configuration: activity.configuration as Prisma.InputJsonValue })) } })) }
  }

  private definition(version: Awaited<ReturnType<PrismaProgramAdministrationRepository['findVersionRecord']>>): ProgramVersionDefinition {
    return { title: version.title, description: version.description, durationDays: version.durationDays, executionConfiguration: version.executionConfiguration as ProgramVersionDefinition['executionConfiguration'], phases: version.phases.map((phase) => ({ key: phase.key, title: phase.title, description: phase.description, position: phase.position, activities: phase.activities.map((activity) => ({ key: activity.key, title: activity.title, description: activity.description, position: activity.position, type: activity.type, frequency: activity.frequency, configuration: activity.configuration as Record<string, unknown> })) })) }
  }

  private async findVersion(tx: Prisma.TransactionClient, id: string): Promise<ProgramVersionView> {
    const version = await this.findVersionRecord(tx, id)
    return { id: version.id, programId: version.programId, versionNumber: version.versionNumber, status: version.status, publishedAt: version.publishedAt, archivedAt: version.archivedAt, ...this.definition(version) }
  }

  private findVersionRecord(tx: Prisma.TransactionClient, id: string) {
    return tx.programVersion.findUniqueOrThrow({ where: { id }, include: { phases: { orderBy: { position: 'asc' }, include: { activities: { orderBy: { position: 'asc' } } } } } })
  }

  private async lockProgram(tx: Prisma.TransactionClient, id: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`disciplina-pro:program:${id}`}))`
    const program = await tx.program.findUnique({ where: { id } })
    if (!program) throw new ProgramNotFoundError()
    return program
  }

  private async assertActor(tx: Prisma.TransactionClient, id: string) {
    const active = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT pa.id FROM platform_accesses pa JOIN users u ON u.id = pa.user_id
      WHERE pa.id = ${id}::uuid AND pa.status = 'ACTIVE' AND u.status = 'ACTIVE'
      FOR UPDATE OF pa
    `
    if (active.length !== 1) throw new PlatformProgramActorInactiveError()
  }

  private audit(tx: Prisma.TransactionClient, actorPlatformAccessId: string, action: string, entityId: string, metadata: Prisma.InputJsonObject) {
    return tx.auditEvent.create({ data: { actorType: 'PLATFORM_ACCESS', actorPlatformAccessId, entityType: 'Program', entityId, action, metadata } })
  }

  private activityCount(definition: ProgramVersionDefinition) { return definition.phases.reduce((total, phase) => total + phase.activities.length, 0) }
  private isUnique(error: unknown) { return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' }
}
