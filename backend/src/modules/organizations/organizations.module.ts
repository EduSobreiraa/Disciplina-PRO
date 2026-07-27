import { Module } from '@nestjs/common'
import { OrganizationContextRepository } from './application/organization-context.repository.js'
import { PermissionGuard } from './http/permission.guard.js'
import { PlatformAccessGuard } from './http/platform-access.guard.js'
import { TenantContextGuard } from './http/tenant-context.guard.js'
import { PrismaOrganizationContextRepository } from './infrastructure/prisma-organization-context.repository.js'
import { TenantAdministrationRepository } from './application/tenant-administration.repository.js'
import { PrismaTenantAdministrationRepository } from './infrastructure/prisma-tenant-administration.repository.js'
import { CreateTenantUseCase } from './application/create-tenant.use-case.js'
import { SuspendTenantUseCase } from './application/suspend-tenant.use-case.js'
import { ReactivateTenantUseCase } from './application/reactivate-tenant.use-case.js'
import { CloseTenantUseCase } from './application/close-tenant.use-case.js'
import { PlatformTenantsController } from './http/platform-tenants.controller.js'
import { TeamAdministrationRepository } from './application/team-administration.repository.js'
import { ArchiveTeamUseCase, CreateTeamUseCase, ListTeamsUseCase, RestoreTeamUseCase, UpdateTeamUseCase } from './application/team-administration.use-cases.js'
import { PrismaTeamAdministrationRepository } from './infrastructure/prisma-team-administration.repository.js'
import { TenantTeamsController } from './http/tenant-teams.controller.js'
import { CeoReplacementRepository, MembershipAdministrationRepository } from './application/membership-administration.repository.js'
import { AssignTeamMembershipUseCase, ChangeMembershipRoleUseCase, EndTeamMembershipUseCase, InactivateMembershipUseCase, ListMembershipsUseCase, ReactivateMembershipUseCase, ReplaceCeoUseCase, SuspendMembershipUseCase } from './application/membership-administration.use-cases.js'
import { PrismaMembershipAdministrationRepository } from './infrastructure/prisma-membership-administration.repository.js'
import { TenantMembershipsController } from './http/tenant-memberships.controller.js'
import { ProgramsModule } from '../programs/programs.module.js'
import { ExecutionModule } from '../execution/execution.module.js'
import { GetSessionContextUseCase } from './application/get-session-context.use-case.js'
import { SessionContextRepository } from './application/session-context.repository.js'
import { SessionContextController } from './http/session-context.controller.js'
import { PrismaSessionContextRepository } from './infrastructure/prisma-session-context.repository.js'

@Module({
  imports: [ProgramsModule, ExecutionModule],
  controllers: [PlatformTenantsController, TenantTeamsController, TenantMembershipsController, SessionContextController],
  providers: [
    TenantContextGuard,
    PlatformAccessGuard,
    PermissionGuard,
    { provide: OrganizationContextRepository, useClass: PrismaOrganizationContextRepository },
    { provide: TenantAdministrationRepository, useClass: PrismaTenantAdministrationRepository },
    { provide: TeamAdministrationRepository, useClass: PrismaTeamAdministrationRepository },
    { provide: MembershipAdministrationRepository, useClass: PrismaMembershipAdministrationRepository },
    { provide: CeoReplacementRepository, useExisting: MembershipAdministrationRepository },
    { provide: SessionContextRepository, useClass: PrismaSessionContextRepository },
    CreateTenantUseCase,
    SuspendTenantUseCase,
    ReactivateTenantUseCase,
    CloseTenantUseCase,
    ListTeamsUseCase,
    CreateTeamUseCase,
    UpdateTeamUseCase,
    ArchiveTeamUseCase,
    RestoreTeamUseCase,
    ListMembershipsUseCase,
    AssignTeamMembershipUseCase,
    EndTeamMembershipUseCase,
    SuspendMembershipUseCase,
    InactivateMembershipUseCase,
    ReactivateMembershipUseCase,
    ChangeMembershipRoleUseCase,
    ReplaceCeoUseCase,
    GetSessionContextUseCase,
  ],
  exports: [TenantContextGuard, PlatformAccessGuard, PermissionGuard, OrganizationContextRepository],
})
export class OrganizationsModule {}
