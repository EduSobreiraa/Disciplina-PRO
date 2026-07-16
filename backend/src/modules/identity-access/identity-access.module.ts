import { Module } from '@nestjs/common'
import { BootstrapSuperAdminUseCase } from './application/bootstrap-super-admin.use-case.js'
import { CreateUserUseCase } from './application/create-user.use-case.js'
import { IdentityRepository } from './application/identity.repository.js'
import { PasswordHasher } from './application/password-hasher.js'
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js'
import { PrismaIdentityRepository } from './infrastructure/prisma-identity.repository.js'

@Module({
  providers: [
    CreateUserUseCase,
    BootstrapSuperAdminUseCase,
    { provide: IdentityRepository, useClass: PrismaIdentityRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
  ],
  exports: [CreateUserUseCase, BootstrapSuperAdminUseCase, PasswordHasher],
})
export class IdentityAccessModule {}
