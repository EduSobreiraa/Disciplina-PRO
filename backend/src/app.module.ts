import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LoggerModule } from 'nestjs-pino'
import { type Environment, validateEnvironment } from './config/environment.js'
import { PrismaModule } from './database/prisma.module.js'
import { HealthController } from './health/health.controller.js'
import { HealthService } from './health/health.service.js'
import { IdentityAccessModule } from './modules/identity-access/identity-access.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'), validate: validateEnvironment }),
    PrismaModule,
    IdentityAccessModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => [{ ttl: config.get('RATE_LIMIT_TTL_MS', { infer: true }), limit: config.get('RATE_LIMIT_MAX', { infer: true }) }],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (request) => request.headers['x-request-id']?.toString() ?? randomUUID(),
          redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.x-csrf-token', 'res.headers.set-cookie'],
        },
      }),
    }),
  ],
  controllers: [HealthController],
  providers: [HealthService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
