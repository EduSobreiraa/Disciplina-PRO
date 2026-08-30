import { BadRequestException, Controller, Get, type INestApplication } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import { configureApp } from './configure-app.js'

@Controller('security-probe')
class SecurityProbeController {
  @Get()
  read() { return { ok: true } }

  @Get('failure')
  fail() { throw new BadRequestException('Falha controlada') }
}

describe('security HTTP configuration', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ FRONTEND_URL: 'https://app.example.test', REQUEST_BODY_LIMIT: '100kb', TRUST_PROXY_HOPS: 1 })],
        }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1 }]),
      ],
      controllers: [SecurityProbeController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile()
    app = moduleRef.createNestApplication({ bodyParser: false })
    configureApp(app)
    await app.init()
  })

  afterAll(async () => app.close())

  it('uses the trusted proxy client IP for rate limiting', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0]
    await request(server).get('/api/security-probe').set('X-Forwarded-For', '203.0.113.10').expect(200)
    await request(server).get('/api/security-probe').set('X-Forwarded-For', '203.0.113.10').expect(429)
    await request(server).get('/api/security-probe').set('X-Forwarded-For', '203.0.113.11').expect(200)
  })

  it('does not reflect query parameters in error responses', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/security-probe/failure?token=must-not-leak')
      .set('X-Forwarded-For', '203.0.113.12')
      .expect(400)
    expect(response.body).toMatchObject({ path: '/api/security-probe/failure' })
    expect(JSON.stringify(response.body)).not.toContain('must-not-leak')
  })
})
