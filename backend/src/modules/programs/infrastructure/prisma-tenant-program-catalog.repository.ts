import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../database/prisma.service.js'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { TenantProgramCatalogRepository } from '../application/tenant-program-catalog.repository.js'

const effectiveWhere = (tenantId: string) => ({
  tenantId,
  status: 'ENABLED' as const,
  tenant: { status: 'ACTIVE' as const },
  program: {
    status: 'ACTIVE' as const,
    versions: { some: { status: 'PUBLISHED' as const } },
  },
})

const enrollmentFor = (membershipId: string) => ({
  where: { membershipId, cycleNumber: 1 },
  select: { id: true, status: true, cycleNumber: true },
  take: 1,
})

@Injectable()
export class PrismaTenantProgramCatalogRepository extends TenantProgramCatalogRepository {
  constructor(private readonly prisma: PrismaService) { super() }

  async list(context: CurrentTenantContext) {
    const rows = await this.prisma.tenantProgram.findMany({
      where: effectiveWhere(context.tenantId),
      select: {
        program: {
          select: {
            id: true, slug: true, name: true, summary: true,
            versions: {
              where: { status: 'PUBLISHED' },
              select: { id: true, versionNumber: true, title: true, description: true, durationDays: true, executionConfiguration: true },
              take: 1,
            },
          },
        },
        enrollments: enrollmentFor(context.membershipId),
      },
      orderBy: { program: { name: 'asc' } },
    })
    return rows.map(({ program, enrollments }) => ({
      id: program.id,
      slug: program.slug,
      name: program.name,
      summary: program.summary,
      version: program.versions[0],
      enrollment: enrollments[0] ?? null,
    }))
  }

  async detail(context: CurrentTenantContext, programId: string) {
    const row = await this.prisma.tenantProgram.findFirst({
      where: { ...effectiveWhere(context.tenantId), programId },
      select: {
        program: {
          select: {
            id: true, slug: true, name: true, summary: true,
            versions: {
              where: { status: 'PUBLISHED' },
              select: {
                id: true, versionNumber: true, title: true, description: true, durationDays: true, executionConfiguration: true,
                phases: {
                  select: {
                    id: true, key: true, title: true, description: true, position: true,
                    activities: {
                      select: { id: true, key: true, title: true, description: true, position: true, type: true, frequency: true, configuration: true },
                      orderBy: { position: 'asc' },
                    },
                  },
                  orderBy: { position: 'asc' },
                },
              },
              take: 1,
            },
          },
        },
        enrollments: enrollmentFor(context.membershipId),
      },
    })
    if (!row) return null
    return {
      id: row.program.id,
      slug: row.program.slug,
      name: row.program.name,
      summary: row.program.summary,
      version: row.program.versions[0],
      enrollment: row.enrollments[0] ?? null,
    }
  }
}
