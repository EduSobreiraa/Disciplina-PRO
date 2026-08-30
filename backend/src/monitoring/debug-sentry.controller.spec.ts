import { type INestApplication, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { HttpExceptionFilter } from '../http/http-exception.filter.js'
import { DebugSentryController } from './debug-sentry.controller.js'

function controllerFor(stage: string) {
  process.env.SENTRY_ENVIRONMENT = stage
  return new DebugSentryController()
}

describe('DebugSentryController', () => {
  afterEach(() => delete process.env.SENTRY_ENVIRONMENT)

  it('throws the Sentry test error in the lab', () => {
    expect(() => controllerFor('lab').getError()).toThrow('My first Sentry error!')
  })

  it('hides the endpoint outside the lab', () => {
    expect(() => controllerFor('production').getError()).toThrow(NotFoundException)
  })
})

describe('GET /api/debug-sentry', () => {
  let app: INestApplication

  beforeAll(async () => {
    process.env.SENTRY_ENVIRONMENT = 'lab'
    const moduleRef = await Test.createTestingModule({
      controllers: [DebugSentryController],
    }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()
  })

  afterAll(async () => {
    delete process.env.SENTRY_ENVIRONMENT
    await app.close()
  })

  it('returns a sanitized 500 response for the test error', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/debug-sentry').expect(500)
    expect(response.body).toMatchObject({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro interno do servidor', path: '/api/debug-sentry' })
    expect(JSON.stringify(response.body)).not.toContain('My first Sentry error!')
  })
})
