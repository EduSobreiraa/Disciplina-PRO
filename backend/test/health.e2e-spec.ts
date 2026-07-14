import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'

describe('Health endpoint', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
  })

  afterAll(async () => app.close())

  it('GET /api/health', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/health').expect(200).expect({ status: 'ok', service: 'disciplina-pro-api' })
  })
})
