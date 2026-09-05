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
import { ConfigService } from '@nestjs/config'
import type { Environment } from '../../config/environment.js'
import { ResendInvitationDelivery } from './infrastructure/resend-invitation-delivery.js'
import { ResendDeliveryRepository } from './application/resend-delivery.repository.js'
import { PrismaResendDeliveryRepository } from './infrastructure/prisma-resend-delivery.repository.js'
import { ResendWebhookController } from './http/resend-webhook.controller.js'
import { ProcessInvitationRetriesUseCase } from './application/process-invitation-retries.use-case.js'
import { InvitationRetryRepository } from './application/invitation-retry.repository.js'
import { PrismaInvitationRetryRepository } from './infrastructure/prisma-invitation-retry.repository.js'
import { ProcessInvitationNoticesUseCase } from './application/process-invitation-notices.use-case.js'
import { InvitationNoticeDelivery, InvitationNoticeRepository } from './application/invitation-notice.js'
import { PrismaInvitationNoticeRepository } from './infrastructure/prisma-invitation-notice.repository.js'
import { ResendInvitationNoticeDelivery } from './infrastructure/resend-invitation-notice.delivery.js'

@Module({
  imports: [IdentityAccessModule, ProgramsModule],
  controllers: [TenantInvitationsController, PlatformInvitationsController, InvitationAcceptanceController, ResendWebhookController],
  providers: [
    { provide: InvitationAdministrationRepository, useClass: PrismaInvitationAdministrationRepository },
    { provide: InvitationAcceptanceRepository, useClass: PrismaInvitationAcceptanceRepository },
    { provide: InvitationTokenService, useClass: HmacInvitationTokenService },
    { provide: SmtpClient, useClass: NodemailerSmtpClient },
    SmtpInvitationDelivery,
    ResendInvitationDelivery,
    ProcessInvitationRetriesUseCase,
    ProcessInvitationNoticesUseCase,
    { provide: InvitationNoticeRepository, useClass: PrismaInvitationNoticeRepository },
    { provide: InvitationNoticeDelivery, useClass: ResendInvitationNoticeDelivery },
    { provide: InvitationRetryRepository, useClass: PrismaInvitationRetryRepository },
    { provide: ResendDeliveryRepository, useClass: PrismaResendDeliveryRepository },
    {
      provide: InvitationDelivery,
      inject: [ConfigService, SmtpInvitationDelivery, ResendInvitationDelivery],
      useFactory: (config: ConfigService<Environment, true>, smtp: SmtpInvitationDelivery, resend: ResendInvitationDelivery) => config.get('INVITATION_EMAIL_PROVIDER', { infer: true }) === 'resend' ? resend : smtp,
    },
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
