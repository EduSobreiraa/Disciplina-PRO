import { Injectable } from '@nestjs/common'
import type { Prisma } from '../../../generated/prisma/client.js'
import { PrismaService } from '../../../database/prisma.service.js'
import { BundledProgramMaterializationRepository } from '../application/bundled-program-materialization.repository.js'
import type { ProgramVersionView } from '../application/program-administration.repository.js'

const versionSelect = {
  id: true,
  programId: true,
  versionNumber: true,
  status: true,
  title: true,
  description: true,
  durationDays: true,
  executionConfiguration: true,
  publishedAt: true,
  archivedAt: true,
  phases: {
    orderBy: { position: 'asc' },
    select: {
      key: true,
      title: true,
      description: true,
      position: true,
      activities: {
        orderBy: { position: 'asc' },
        select: {
          key: true,
          title: true,
          description: true,
          position: true,
          type: true,
          frequency: true,
          configuration: true,
        },
      },
    },
  },
} satisfies Prisma.ProgramVersionSelect

type VersionRecord = Prisma.ProgramVersionGetPayload<{ select: typeof versionSelect }>

@Injectable()
export class PrismaBundledProgramMaterializationRepository extends BundledProgramMaterializationRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  async findBySlug(slug: string) {
    const program = await this.prisma.program.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        summary: true,
        versions: {
          where: { status: { in: ['DRAFT', 'PUBLISHED'] } },
          select: versionSelect,
          orderBy: { versionNumber: 'desc' },
        },
      },
    })
    if (!program) return null
    const published = program.versions.find(({ status }) => status === 'PUBLISHED')
    const draft = program.versions.find(({ status }) => status === 'DRAFT')
    return {
      id: program.id,
      slug: program.slug,
      name: program.name,
      summary: program.summary,
      published: published ? this.view(published) : null,
      draft: draft ? this.view(draft) : null,
    }
  }

  private view(version: VersionRecord): ProgramVersionView {
    return {
      id: version.id,
      programId: version.programId,
      versionNumber: version.versionNumber,
      status: version.status,
      title: version.title,
      description: version.description,
      durationDays: version.durationDays,
      executionConfiguration: version.executionConfiguration as ProgramVersionView['executionConfiguration'],
      publishedAt: version.publishedAt,
      archivedAt: version.archivedAt,
      phases: version.phases.map((phase) => ({
        ...phase,
        activities: phase.activities.map((activity) => ({
          ...activity,
          configuration: activity.configuration as Record<string, unknown>,
        })),
      })),
    }
  }
}
