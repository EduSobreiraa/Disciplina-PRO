import { Injectable } from '@nestjs/common'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { AuditQueryRepository, type AuditPageInput } from './audit.repository.js'

@Injectable()
export class GetMyAuditUseCase {
  constructor(private readonly repository: AuditQueryRepository) {}
  execute(context: CurrentTenantContext, input: AuditPageInput) {
    return this.repository.findMine(context, input)
  }
}

@Injectable()
export class GetTeamAuditUseCase {
  constructor(private readonly repository: AuditQueryRepository) {}
  execute(context: CurrentTenantContext, teamId: string, input: AuditPageInput) {
    return this.repository.findTeam(context, teamId, input)
  }
}

@Injectable()
export class GetTenantAuditUseCase {
  constructor(private readonly repository: AuditQueryRepository) {}
  execute(context: CurrentTenantContext, input: AuditPageInput) {
    return this.repository.findTenant(context, input)
  }
}
