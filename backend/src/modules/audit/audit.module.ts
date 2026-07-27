import { Module } from '@nestjs/common'
import { AuditQueryRepository } from './application/audit.repository.js'
import { AuditWriter } from './application/audit-writer.js'
import { GetMyAuditUseCase, GetTeamAuditUseCase, GetTenantAuditUseCase } from './application/audit.use-cases.js'
import { AuditController } from './http/audit.controller.js'
import { PrismaAuditRepository } from './infrastructure/prisma-audit.repository.js'

@Module({
  controllers: [AuditController],
  providers: [
    PrismaAuditRepository,
    { provide: AuditQueryRepository, useExisting: PrismaAuditRepository },
    { provide: AuditWriter, useExisting: PrismaAuditRepository },
    GetMyAuditUseCase,
    GetTeamAuditUseCase,
    GetTenantAuditUseCase,
  ],
  exports: [AuditWriter],
})
export class AuditModule {}
