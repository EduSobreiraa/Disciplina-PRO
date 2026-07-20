import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { configureApp } from '../src/http/configure-app.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'

const ORIGIN = 'http://localhost:5173'

function cookieValue(cookies: string[], name: string) {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`))
  if (!cookie) throw new Error(`Cookie ${name} não encontrado`)
  return cookie.split(';', 1)[0]
}

describe('Authentication HTTP contract', () => {
  let app: INestApplication
  let prisma: PrismaService
  const email = `auth-${Date.now()}@disciplina.test`
  const password = 'uma frase de login muito segura'

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    await app.get(CreateUserUseCase).execute({ email, password })
  })

  afterAll(async () => app.close())

  it('rejects absent or unknown origins before authenticating', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/login').send({ email, password }).expect(403)
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/login').set('Origin', 'https://evil.example').send({ email, password }).expect(403)
    expect(response.body).toMatchObject({ code: 'ORIGIN_NOT_ALLOWED' })
  })

  it('uses one generic credential error', async () => {
    const wrongPassword = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/login').set('Origin', ORIGIN).send({ email, password: 'senha errada' }).expect(401)
    const unknownUser = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'unknown@disciplina.test', password: 'senha errada' }).expect(401)
    expect(wrongPassword.body).toMatchObject({ code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos' })
    expect(unknownUser.body).toMatchObject({ code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos' })
  })

  it('sets secure transport cookies, requires CSRF and detects replay', async () => {
    const login = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/login').set('Origin', ORIGIN).send({ email, password }).expect(200)
    const loginBody = login.body as Record<string, unknown>
    expect(loginBody).toMatchObject({ tokenType: 'Bearer' })
    expect(loginBody.accessToken).toEqual(expect.any(String))
    const loginCookies = login.headers['set-cookie'] as unknown as string[]
    const refresh = cookieValue(loginCookies, 'dp_refresh')
    const csrf = cookieValue(loginCookies, 'dp_csrf')
    expect(loginCookies.join(' ')).toContain('HttpOnly')
    expect(loginCookies.join(' ')).toContain('SameSite=Lax')

    await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/refresh').set('Origin', ORIGIN).set('Cookie', [refresh, csrf]).expect(403)
    const csrfValue = decodeURIComponent(csrf.slice('dp_csrf='.length))
    const rotated = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/refresh').set('Origin', ORIGIN).set('Cookie', [refresh, csrf]).set('X-CSRF-Token', csrfValue).expect(200)
    expect(rotated.headers['set-cookie']).toBeDefined()

    const replay = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/refresh').set('Origin', ORIGIN).set('Cookie', [refresh, csrf]).set('X-CSRF-Token', csrfValue).expect(401)
    expect(replay.body).toMatchObject({ code: 'SESSION_REVOKED' })
  })

  it('revokes a current session and clears both cookies', async () => {
    const login = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/login').set('Origin', ORIGIN).send({ email, password }).expect(200)
    const cookies = login.headers['set-cookie'] as unknown as string[]
    const refresh = cookieValue(cookies, 'dp_refresh')
    const csrf = cookieValue(cookies, 'dp_csrf')
    await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', [refresh, csrf]).set('X-CSRF-Token', decodeURIComponent(csrf.slice('dp_csrf='.length))).expect(204).expect((response) => {
      expect((response.headers['set-cookie'] as unknown as string[]).join(' ')).toContain('Expires=Thu, 01 Jan 1970')
    })
  })

  it('rejects an expired refresh token and clears cookies', async () => {
    const login = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/login').set('Origin', ORIGIN).send({ email, password }).expect(200)
    const cookies = login.headers['set-cookie'] as unknown as string[]
    const refresh = cookieValue(cookies, 'dp_refresh')
    const csrf = cookieValue(cookies, 'dp_csrf')
    const latest = await prisma.refreshToken.findFirstOrThrow({ orderBy: { createdAt: 'desc' } })
    await prisma.refreshToken.update({
      where: { id: latest.id },
      data: { createdAt: new Date(Date.now() - 2 * 86_400_000), expiresAt: new Date(Date.now() - 86_400_000) },
    })
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).post('/api/auth/refresh').set('Origin', ORIGIN).set('Cookie', [refresh, csrf]).set('X-CSRF-Token', decodeURIComponent(csrf.slice('dp_csrf='.length))).expect(401)
    expect(response.body).toMatchObject({ code: 'INVALID_SESSION' })
    expect(response.headers['set-cookie']).toBeDefined()
  })
})
