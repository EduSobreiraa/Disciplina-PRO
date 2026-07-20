import { Module } from '@nestjs/common'
import { BootstrapSuperAdminUseCase } from './application/bootstrap-super-admin.use-case.js'
import { AccessTokenService } from './application/access-token.js'
import { Clock, SystemClock } from './application/clock.js'
import { CreateUserUseCase } from './application/create-user.use-case.js'
import { CreateSessionUseCase } from './application/create-session.use-case.js'
import { IdentityRepository } from './application/identity.repository.js'
import { PasswordHasher } from './application/password-hasher.js'
import { RefreshTokenService } from './application/refresh-token.js'
import { RevokeAllSessionsUseCase } from './application/revoke-all-sessions.use-case.js'
import { RevokeSessionUseCase } from './application/revoke-session.use-case.js'
import { RotateSessionUseCase } from './application/rotate-session.use-case.js'
import { SessionRepository } from './application/session.repository.js'
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js'
import { JoseAccessTokenService } from './infrastructure/jose-access-token.service.js'
import { OpaqueRefreshTokenService } from './infrastructure/opaque-refresh-token.service.js'
import { PrismaIdentityRepository } from './infrastructure/prisma-identity.repository.js'
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository.js'

@Module({
  providers: [
    CreateUserUseCase,
    BootstrapSuperAdminUseCase,
    CreateSessionUseCase,
    RotateSessionUseCase,
    RevokeSessionUseCase,
    RevokeAllSessionsUseCase,
    { provide: IdentityRepository, useClass: PrismaIdentityRepository },
    { provide: SessionRepository, useClass: PrismaSessionRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: AccessTokenService, useClass: JoseAccessTokenService },
    { provide: RefreshTokenService, useClass: OpaqueRefreshTokenService },
    { provide: Clock, useClass: SystemClock },
  ],
  exports: [
    CreateUserUseCase,
    BootstrapSuperAdminUseCase,
    CreateSessionUseCase,
    RotateSessionUseCase,
    RevokeSessionUseCase,
    RevokeAllSessionsUseCase,
    AccessTokenService,
    PasswordHasher,
  ],
})
export class IdentityAccessModule {}
