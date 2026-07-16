import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { INestApplication } from '@nestjs/common'
import { json, urlencoded } from 'express'
import helmet from 'helmet'
import type { Environment } from '../config/environment.js'
import { HttpExceptionFilter } from './http-exception.filter.js'
import { requestIdMiddleware } from './request-id.middleware.js'

export function configureApp(app: INestApplication) {
  const config = app.get<ConfigService<Environment, true>>(ConfigService)
  const bodyLimit = config.get('REQUEST_BODY_LIMIT', { infer: true })

  app.use(requestIdMiddleware)
  app.use(helmet())
  app.use(json({ limit: bodyLimit }))
  app.use(urlencoded({ extended: true, limit: bodyLimit }))
  app.enableCors({ origin: config.get('FRONTEND_URL', { infer: true }), credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.useGlobalFilters(new HttpExceptionFilter())
  app.setGlobalPrefix('api')
}
