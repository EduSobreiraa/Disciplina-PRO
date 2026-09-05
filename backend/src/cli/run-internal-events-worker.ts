import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module.js'
import type { Environment } from '../config/environment.js'
import { ProcessInternalEventsUseCase } from '../modules/events/application/process-internal-events.use-case.js'
import { ProcessInvitationRetriesUseCase } from '../modules/invitations/application/process-invitation-retries.use-case.js'
import { ProcessInvitationNoticesUseCase } from '../modules/invitations/application/process-invitation-notices.use-case.js'

const logger = new Logger('InternalEventsWorker')
let stopping = false

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

function workerErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const candidate = String(error.code).trim().toUpperCase()
    if (/^[A-Z0-9_:-]{1,80}$/.test(candidate)) return candidate
  }
  return 'OUTBOX_WORKER_ERROR'
}

function requestStop(signal: string) {
  if (stopping) return
  stopping = true
  logger.log({ signal, worker: 'internal-events' }, 'Encerramento gracioso do worker solicitado')
}

process.once('SIGTERM', () => requestStop('SIGTERM'))
process.once('SIGINT', () => requestStop('SIGINT'))

async function run() {
  while (!stopping) {
    let app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined
    try {
      app = await NestFactory.createApplicationContext(AppModule)
      const config = app.get<ConfigService<Environment, true>>(ConfigService)
      const processor = app.get(ProcessInternalEventsUseCase)
      const emailRetries = app.get(ProcessInvitationRetriesUseCase)
      const emailNotices = app.get(ProcessInvitationNoticesUseCase)
      const pollInterval = config.get('OUTBOX_WORKER_POLL_INTERVAL_MS', { infer: true })
      const errorDelay = config.get('OUTBOX_WORKER_ERROR_DELAY_MS', { infer: true })
      logger.log({ worker: 'internal-events', pollInterval }, 'Worker de eventos internos iniciado')

      while (!stopping) {
        try {
          const result = await processor.execute()
          const emailResult = await emailRetries.execute()
          const noticeResult = await emailNotices.execute()
          if (noticeResult.processed) logger.log({ worker: 'invitation-notices', ...noticeResult }, 'Ciclo de avisos concluído')
          if (emailResult.sent || emailResult.reviewed || emailResult.cancelled) logger.log({ worker: 'invitation-retries', ...emailResult }, 'Ciclo de reenvios concluído')
          if (result.claimed > 0 || result.failed > 0 || result.leaseLost > 0) {
            logger.log({ worker: 'internal-events', ...result }, 'Ciclo do worker de eventos concluído')
          }
          if (!stopping) await sleep(pollInterval)
        } catch (error) {
          logger.error({ worker: 'internal-events', errorCode: workerErrorCode(error), err: error }, 'Ciclo do worker de eventos falhou; nova tentativa será feita')
          if (!stopping) await sleep(errorDelay)
        }
      }
    } catch (error) {
      logger.error({ worker: 'internal-events', errorCode: workerErrorCode(error), err: error }, 'Worker não conseguiu iniciar; nova tentativa será feita')
      if (!stopping) await sleep(5_000)
    } finally {
      await app?.close()
    }
  }
}

await run()
