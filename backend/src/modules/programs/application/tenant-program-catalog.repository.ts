import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'

export interface TenantProgramCatalogItem {
  id: string
  slug: string
  name: string
  summary: string
  version: {
    id: string
    versionNumber: number
    title: string
    description: string
    durationDays: number
    executionConfiguration: unknown
  }
  enrollment: { id: string; status: string; cycleNumber: number } | null
}

export interface TenantProgramCatalogDetail extends TenantProgramCatalogItem {
  version: TenantProgramCatalogItem['version'] & {
    phases: Array<{
      id: string
      key: string
      title: string
      description: string
      position: number
      activities: Array<{
        id: string
        key: string
        title: string
        description: string
        position: number
        type: string
        frequency: string
        configuration: unknown
      }>
    }>
  }
}

export abstract class TenantProgramCatalogRepository {
  abstract list(context: CurrentTenantContext): Promise<TenantProgramCatalogItem[]>
  abstract detail(context: CurrentTenantContext, programId: string): Promise<TenantProgramCatalogDetail | null>
}
