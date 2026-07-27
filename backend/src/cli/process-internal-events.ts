import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module.js'
import { ProcessInternalEventsUseCase } from '../modules/events/application/process-internal-events.use-case.js'

const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
try {
  const result = await app.get(ProcessInternalEventsUseCase).execute()
  process.stdout.write(
    `Eventos: ${result.claimed} reivindicados, ${result.processed} processados, `
    + `${result.retried} reagendados, ${result.failed} falhos, ${result.leaseLost} leases perdidas\n`,
  )
} finally {
  await app.close()
}

