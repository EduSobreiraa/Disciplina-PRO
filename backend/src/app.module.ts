import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { randomUUID } from 'node:crypto'
import { LoggerModule } from 'nestjs-pino'
import { type Environment, validateEnvironment } from './config/environment.js'
import { DatabaseModule } from './database/database.module.js'
import { HealthController } from './health/health.controller.js'
import { HealthService } from './health/health.service.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
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
          redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
        },
      }),
    }),
  ],
  controllers: [HealthController],
  providers: [HealthService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
