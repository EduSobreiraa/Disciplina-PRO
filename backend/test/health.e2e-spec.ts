import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { configureApp } from '../src/http/configure-app.js'

describe('Health endpoint', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
  })

  afterAll(async () => app.close())

  it('GET /api/health', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/health').set('x-request-id', 'test-request-id').expect(200).expect({ status: 'ok', service: 'disciplina-pro-api' })
    expect(response.headers['x-request-id']).toBe('test-request-id')
  })

  it('returns the standard error contract', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/missing').expect(404)
    const body = response.body as Record<string, unknown>
    expect(body).toMatchObject({ statusCode: 404, code: 'HTTP_ERROR', path: '/api/missing' })
    expect(body.requestId).toEqual(expect.any(String))
  })

  it('rejects payloads above the configured limit', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/missing').send({ content: 'x'.repeat(110_000) }).expect(413)
    expect(response.headers['x-request-id']).toEqual(expect.any(String))
  })

  it('allows PUT in an exact-origin CORS preflight', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .options('/api/enrollments/00000000-0000-0000-0000-000000000000/daily-record')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'authorization,content-type,x-tenant-id')
      .expect(204)

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(response.headers['access-control-allow-methods']).toContain('PUT')
  })
})
