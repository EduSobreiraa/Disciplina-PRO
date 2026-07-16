import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module.js'
import type { Environment } from './config/environment.js'
import { configureApp } from './http/configure-app.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false })
  const config = app.get<ConfigService<Environment, true>>(ConfigService)

  configureApp(app)

  const openApi = new DocumentBuilder().setTitle('Disciplina PRO API').setVersion('0.1.0').build()
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApi))

  await app.listen(config.get('PORT', { infer: true }))
}

void bootstrap()
