import { Module } from '@nestjs/common'
import { ProgramAdministrationRepository } from './application/program-administration.repository.js'
import { ArchiveProgramUseCase, CreateProgramUseCase, CreateProgramVersionUseCase, PublishProgramVersionUseCase, ReplaceProgramDraftUseCase, UpdateProgramUseCase } from './application/program-administration.use-cases.js'
import { PlatformProgramsController } from './http/platform-programs.controller.js'
import { PrismaProgramAdministrationRepository } from './infrastructure/prisma-program-administration.repository.js'
import { TenantProgramAdministrationRepository } from './application/tenant-program-administration.repository.js'
import { DisableTenantProgramUseCase, EnableTenantProgramUseCase } from './application/tenant-program-administration.use-cases.js'
import { PrismaTenantProgramAdministrationRepository } from './infrastructure/prisma-tenant-program-administration.repository.js'
import { ProgramAvailabilityProvisioner } from './application/program-availability.provisioner.js'
import { PrismaProgramAvailabilityProvisioner } from './infrastructure/prisma-program-availability.provisioner.js'
import { TenantProgramCatalogRepository } from './application/tenant-program-catalog.repository.js'
import { PrismaTenantProgramCatalogRepository } from './infrastructure/prisma-tenant-program-catalog.repository.js'
import { GetTenantProgramDetailUseCase, ListTenantProgramCatalogUseCase } from './application/tenant-program-catalog.use-cases.js'
import { TenantProgramsController } from './http/tenant-programs.controller.js'
import { BundledProgramMaterializationRepository } from './application/bundled-program-materialization.repository.js'
import { MaterializeBundledProgramUseCase } from './application/materialize-bundled-program.use-case.js'
import { PrismaBundledProgramMaterializationRepository } from './infrastructure/prisma-bundled-program-materialization.repository.js'

@Module({
  controllers: [PlatformProgramsController, TenantProgramsController],
  providers: [
    { provide: ProgramAdministrationRepository, useClass: PrismaProgramAdministrationRepository },
    { provide: TenantProgramAdministrationRepository, useClass: PrismaTenantProgramAdministrationRepository },
    { provide: ProgramAvailabilityProvisioner, useClass: PrismaProgramAvailabilityProvisioner },
    { provide: TenantProgramCatalogRepository, useClass: PrismaTenantProgramCatalogRepository },
    { provide: BundledProgramMaterializationRepository, useClass: PrismaBundledProgramMaterializationRepository },
    CreateProgramUseCase,
    UpdateProgramUseCase,
    ReplaceProgramDraftUseCase,
    CreateProgramVersionUseCase,
    PublishProgramVersionUseCase,
    ArchiveProgramUseCase,
    EnableTenantProgramUseCase,
    DisableTenantProgramUseCase,
    ListTenantProgramCatalogUseCase,
    GetTenantProgramDetailUseCase,
    MaterializeBundledProgramUseCase,
  ],
  exports: [ProgramAvailabilityProvisioner, MaterializeBundledProgramUseCase],
})
export class ProgramsModule {}
