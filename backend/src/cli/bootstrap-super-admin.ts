import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module.js'
import { BootstrapSuperAdminUseCase } from '../modules/identity-access/application/bootstrap-super-admin.use-case.js'

const email = process.env.SUPER_ADMIN_EMAIL
const password = process.env.SUPER_ADMIN_PASSWORD

if (!email || !password) throw new Error('SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD são obrigatórias')

const app = await NestFactory.createApplicationContext(AppModule, { logger: false })

try {
  const useCase = app.get(BootstrapSuperAdminUseCase)
  const result = await useCase.execute({ email, password })
  process.stdout.write(`SUPER_ADMIN criado para ${result.email} (${result.platformAccessId})\n`)
} finally {
  await app.close()
}
