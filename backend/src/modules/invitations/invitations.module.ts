import { Module } from '@nestjs/common'
import { CreateFirstCeoInvitationUseCase, CreateInvitationUseCase, ListInvitationsUseCase, ResendInvitationUseCase, RevokeInvitationUseCase } from './application/invitation-administration.use-cases.js'
import { InvitationAdministrationRepository } from './application/invitation-administration.repository.js'
import { InvitationDelivery } from './application/invitation-delivery.js'
import { InvitationTokenService } from './application/invitation-token.js'
import { PlatformInvitationsController } from './http/platform-invitations.controller.js'
import { TenantInvitationsController } from './http/tenant-invitations.controller.js'
import { HmacInvitationTokenService } from './infrastructure/hmac-invitation-token.service.js'
import { PrismaInvitationAdministrationRepository } from './infrastructure/prisma-invitation-administration.repository.js'
import { InvitationAcceptanceRepository } from './application/invitation-acceptance.repository.js'
import { AcceptInvitationForExistingIdentityUseCase, AcceptInvitationForNewIdentityUseCase } from './application/invitation-acceptance.use-cases.js'
import { PrismaInvitationAcceptanceRepository } from './infrastructure/prisma-invitation-acceptance.repository.js'
import { InvitationAcceptanceController } from './http/invitation-acceptance.controller.js'
import { IdentityAccessModule } from '../identity-access/identity-access.module.js'
import { SmtpClient } from './application/smtp-client.js'
import { NodemailerSmtpClient } from './infrastructure/nodemailer-smtp.client.js'
import { SmtpInvitationDelivery } from './infrastructure/smtp-invitation-delivery.js'
import { ProgramsModule } from '../programs/programs.module.js'

@Module({
  imports: [IdentityAccessModule, ProgramsModule],
  controllers: [TenantInvitationsController, PlatformInvitationsController, InvitationAcceptanceController],
  providers: [
    { provide: InvitationAdministrationRepository, useClass: PrismaInvitationAdministrationRepository },
    { provide: InvitationAcceptanceRepository, useClass: PrismaInvitationAcceptanceRepository },
    { provide: InvitationTokenService, useClass: HmacInvitationTokenService },
    { provide: SmtpClient, useClass: NodemailerSmtpClient },
    { provide: InvitationDelivery, useClass: SmtpInvitationDelivery },
    ListInvitationsUseCase,
    CreateInvitationUseCase,
    ResendInvitationUseCase,
    RevokeInvitationUseCase,
    CreateFirstCeoInvitationUseCase,
    AcceptInvitationForNewIdentityUseCase,
    AcceptInvitationForExistingIdentityUseCase,
  ],
})
export class InvitationsModule {}
