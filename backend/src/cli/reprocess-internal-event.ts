import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module.js'
import { ReprocessInternalEventDeliveryUseCase } from '../modules/events/application/process-internal-events.use-case.js'

const deliveryId = process.argv[2]
if (!deliveryId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deliveryId)) {
  throw new Error('Informe o UUID da entrega falha')
}

const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
try {
  const reprocessed = await app.get(ReprocessInternalEventDeliveryUseCase).execute(deliveryId)
  process.stdout.write(reprocessed ? 'Entrega reagendada para processamento\n' : 'Entrega falha não encontrada\n')
  if (!reprocessed) process.exitCode = 1
} finally {
  await app.close()
}

