import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module.js'
import { PrismaService } from '../database/prisma.service.js'
import { MaterializeBundledProgramUseCase } from '../modules/programs/application/materialize-bundled-program.use-case.js'
import { PROJETO66_CATALOG } from '../modules/programs/catalog/projeto66.definition.js'

const platformAccessId = process.env.PLATFORM_ACCESS_ID
if (!platformAccessId) throw new Error('PLATFORM_ACCESS_ID é obrigatório')

const app = await NestFactory.createApplicationContext(AppModule, { logger: false })

try {
  const prisma = app.get(PrismaService)
  const access = await prisma.platformAccess.findFirst({
    where: { id: platformAccessId, status: 'ACTIVE', user: { status: 'ACTIVE' } },
    select: { id: true, userId: true, role: true },
  })
  if (!access) throw new Error('Acesso de plataforma ativo não encontrado')
  const result = await app.get(MaterializeBundledProgramUseCase).execute({
    platformAccessId: access.id,
    userId: access.userId,
    platformRole: access.role,
  }, PROJETO66_CATALOG)
  process.stdout.write(`Projeto 66: ${result.action} (${result.programId}/${result.versionId})\n`)
} finally {
  await app.close()
}
