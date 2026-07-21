import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module.js'
import { CleanupSessionsUseCase } from '../modules/identity-access/application/cleanup-sessions.use-case.js'

const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
try {
  const result = await app.get(CleanupSessionsUseCase).execute()
  process.stdout.write(`Sessões expiradas revogadas: ${result.expiredSessionsRevoked}; sessões eliminadas: ${result.sessionsPurged}\n`)
} finally {
  await app.close()
}
