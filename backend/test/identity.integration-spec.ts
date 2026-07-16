import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { BootstrapSuperAdminUseCase } from '../src/modules/identity-access/application/bootstrap-super-admin.use-case.js'
import { BootstrapAlreadyCompletedError } from '../src/modules/identity-access/domain/identity.errors.js'
import { IdentityAccessModule } from '../src/modules/identity-access/identity-access.module.js'

describe('Identity access integration', () => {
  it('bootstraps exactly one platform admin with hashed credentials and immutable audit', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule, IdentityAccessModule],
    }).compile()
    await moduleRef.init()

    const bootstrap = moduleRef.get(BootstrapSuperAdminUseCase)
    const prisma = moduleRef.get(PrismaService)
    const result = await bootstrap.execute({ email: ' Admin@Disciplina.test ', password: 'uma frase de bootstrap segura' })

    const user = await prisma.user.findUniqueOrThrow({ where: { id: result.userId } })
    expect(user.normalizedEmail).toBe('admin@disciplina.test')
    expect(user.passwordHash).toMatch(/^\$argon2id\$/)
    expect(user.passwordHash).not.toContain('uma frase de bootstrap segura')
    await expect(bootstrap.execute({ email: 'other@disciplina.test', password: 'outra frase de bootstrap segura' })).rejects.toBeInstanceOf(
      BootstrapAlreadyCompletedError,
    )

    const audit = await prisma.auditEvent.findFirstOrThrow({ where: { entityId: result.platformAccessId } })
    expect(audit).toMatchObject({ actorType: 'SYSTEM', action: 'PLATFORM_ACCESS_BOOTSTRAPPED' })
    await expect(prisma.auditEvent.delete({ where: { id: audit.id } })).rejects.toThrow('audit_events are immutable')

    await moduleRef.close()
  })
})
