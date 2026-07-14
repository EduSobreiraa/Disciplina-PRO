import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  const config = app.get(ConfigService)

  app.use(helmet())
  app.enableCors({ origin: config.get<string>('FRONTEND_URL', 'http://localhost:5173'), credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.setGlobalPrefix('api')

  const openApi = new DocumentBuilder().setTitle('Disciplina PRO API').setVersion('0.1.0').build()
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApi))

  await app.listen(config.get<number>('PORT', 3000))
}

void bootstrap()
