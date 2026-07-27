import { Injectable } from '@nestjs/common'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { ProgramNotFoundError } from '../domain/program.errors.js'
import { TenantProgramCatalogRepository } from './tenant-program-catalog.repository.js'

@Injectable()
export class ListTenantProgramCatalogUseCase {
  constructor(private readonly catalog: TenantProgramCatalogRepository) {}
  execute(context: CurrentTenantContext) { return this.catalog.list(context) }
}

@Injectable()
export class GetTenantProgramDetailUseCase {
  constructor(private readonly catalog: TenantProgramCatalogRepository) {}
  async execute(context: CurrentTenantContext, programId: string) {
    const program = await this.catalog.detail(context, programId)
    if (!program) throw new ProgramNotFoundError()
    return program
  }
}
