import { Controller, Get, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import type { CurrentPrincipal } from '../src/modules/identity-access/application/authenticated-principal.repository.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { RevokeSessionUseCase } from '../src/modules/identity-access/application/revoke-session.use-case.js'
import { CurrentPrincipalParam } from '../src/modules/identity-access/http/current-principal.decorator.js'
import { RequestedTenantId } from '../src/modules/organizations/http/requested-tenant-id.decorator.js'

const ORIGIN = 'http://localhost:5173'

@Controller('test/protected')
class ProtectedProbeController {
  @Get()
  read(@CurrentPrincipalParam() principal: CurrentPrincipal, @RequestedTenantId() requestedTenantId?: string) {
    return { principal, requestedTenantId }
  }
}

describe('AuthenticationGuard integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let revoke: RevokeSessionUseCase
  const email = `guard-${Date.now()}@disciplina.test`
  const password = 'uma frase de guard muito segura'

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [ProtectedProbeController] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    revoke = app.get(RevokeSessionUseCase)
    await app.get(CreateUserUseCase).execute({ email, password })
  })
  afterAll(async () => app.close())

  async function login() {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/login').set('Origin', ORIGIN).send({ email, password }).expect(200)
    return response.body as { accessToken: string }
  }

  it('rejects missing, malformed and invalid bearer tokens with one stable error', async () => {
    for (const authorization of [undefined, 'Basic abc', 'Bearer invalid', 'Bearer one,two']) {
      const call = request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/test/protected')
      if (authorization) call.set('Authorization', authorization)
      const response = await call.expect(401)
      expect(response.body).toMatchObject({ code: 'AUTHENTICATION_REQUIRED', message: 'Autenticação necessária' })
    }
  })

  it('attaches a claims-minimal principal and treats X-Tenant-Id only as untrusted input', async () => {
    const { accessToken } = await login()
    const tenantId = '019f81e1-e388-752b-ad61-a992994693bf'
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/test/protected').set('Authorization', `Bearer ${accessToken}`).set('X-Tenant-Id', tenantId).expect(200)
    const body = response.body as { principal: Record<string, unknown>; requestedTenantId: string }
    expect(body.requestedTenantId).toBe(tenantId)
    expect(typeof body.principal.userId).toBe('string')
    expect(typeof body.principal.sessionId).toBe('string')
    expect(typeof body.principal.tokenId).toBe('string')
    expect(body.principal).not.toHaveProperty('tenantId')
    expect(body.principal).not.toHaveProperty('role')

    const invalid = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/test/protected').set('Authorization', `Bearer ${accessToken}`).set('X-Tenant-Id', 'not-a-uuid').expect(400)
    expect(invalid.body).toMatchObject({ code: 'INVALID_TENANT_HEADER' })
  })

  it('rejects an otherwise valid JWT immediately after session revocation', async () => {
    const { accessToken } = await login()
    const active = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/test/protected').set('Authorization', `Bearer ${accessToken}`).expect(200)
    const principal = (active.body as { principal: CurrentPrincipal }).principal
    await revoke.execute({ sessionId: principal.sessionId })
    await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/test/protected').set('Authorization', `Bearer ${accessToken}`).expect(401)
  })

  it('rejects an otherwise valid JWT immediately after the user is disabled', async () => {
    const { accessToken } = await login()
    const user = await prisma.user.findUniqueOrThrow({ where: { normalizedEmail: email } })
    await prisma.user.update({ where: { id: user.id }, data: { status: 'DISABLED' } })
    await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/test/protected').set('Authorization', `Bearer ${accessToken}`).expect(401)
  })
})
