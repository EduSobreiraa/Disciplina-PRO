import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import { InvitationTokenService } from '../src/modules/invitations/application/invitation-token.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase de habilitação segura'

describe('Tenant program enablement integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let token: string
  let ceoToken: string
  let tenantId: string
  let programId: string
  let ceoMembershipId: string
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const users = app.get(CreateUserUseCase)
    const created = await Promise.all(['platform', 'ceo', 'manager', 'user', 'suspended'].map((label) =>
      users.execute({ email: `enable-${label}-${suffix}@disciplina.test`, password: PASSWORD })))
    const [platform, ceo, manager, user, suspended] = created
    const tenant = await prisma.tenant.create({ data: { name: 'Tenant Habilitação', slug: `enable-${suffix}`, status: 'ACTIVE' } })
    tenantId = tenant.id
    const memberships = await Promise.all([
      prisma.platformAccess.create({ data: { userId: platform.id } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: ceo.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: manager.id, role: 'MANAGER' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: user.id } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: suspended.id, status: 'SUSPENDED', suspendedAt: new Date() } }),
    ])
    ceoMembershipId = memberships[1].id
    const program = await prisma.program.create({ data: { slug: `enable-program-${suffix}`, name: 'Programa Habilitável', summary: 'Programa global publicado.' } })
    programId = program.id
    const version = await prisma.programVersion.create({ data: { programId, versionNumber: 1, title: 'Versão 1', description: 'Versão publicada.', durationDays: 66 } })
    await prisma.programVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
    const login = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN)
      .send({ email: `enable-platform-${suffix}@disciplina.test`, password: PASSWORD }).expect(200)
    token = (login.body as { accessToken: string }).accessToken
    const ceoLogin = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN)
      .send({ email: `enable-ceo-${suffix}@disciplina.test`, password: PASSWORD }).expect(200)
    ceoToken = (ceoLogin.body as { accessToken: string }).accessToken
  })

  afterAll(async () => app.close())

  function change(action: 'enable' | 'disable') {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .put(`/api/platform/tenants/${tenantId}/programs/${programId}/${action}`)
      .set('Authorization', `Bearer ${token}`)
  }

  it('serializes enablement and provisions each active membership exactly once', async () => {
    const responses = await Promise.all([change('enable'), change('enable')])
    expect(responses.map(({ status }) => status)).toEqual([200, 200])
    expect(await prisma.tenantProgram.count({ where: { tenantId, programId } })).toBe(1)
    const relation = await prisma.tenantProgram.findUniqueOrThrow({ where: { tenantId_programId: { tenantId, programId } } })
    expect(await prisma.enrollment.count({ where: { tenantProgramId: relation.id, status: 'AVAILABLE' } })).toBe(3)
    expect(await prisma.auditEvent.count({ where: { entityId: relation.id, action: 'TENANT_PROGRAM_ENABLED' } })).toBe(1)
    expect(responses.map(({ body }) => (body as { provisionedEnrollments: number }).provisionedEnrollments).sort()).toEqual([0, 3])
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/platform/programs').set('Authorization', `Bearer ${ceoToken}`).expect(403)
    const projection = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/platform/programs').set('Authorization', `Bearer ${token}`).expect(200)
    const programs = projection.body as Array<{ id: string; versions: Array<{ status: string; versionNumber: number }>; tenantPrograms: Array<{ tenantId: string; status: string }> }>
    const listed = programs.find(({ id }) => id === programId)
    expect(listed?.versions.some(({ status, versionNumber }) => status === 'PUBLISHED' && versionNumber === 1)).toBe(true)
    expect(listed?.tenantPrograms.some((item) => item.tenantId === tenantId && item.status === 'ENABLED')).toBe(true)
  })

  it('disables idempotently, preserves offers, and provisions a later active member on reenable', async () => {
    const relation = await prisma.tenantProgram.findUniqueOrThrow({ where: { tenantId_programId: { tenantId, programId } } })
    const disabled = await Promise.all([change('disable'), change('disable')])
    expect(disabled.map(({ status }) => status)).toEqual([200, 200])
    expect(await prisma.enrollment.count({ where: { tenantProgramId: relation.id } })).toBe(3)
    expect(await prisma.auditEvent.count({ where: { entityId: relation.id, action: 'TENANT_PROGRAM_DISABLED' } })).toBe(1)

    const users = app.get(CreateUserUseCase)
    const late = await users.execute({ email: `enable-late-${suffix}@disciplina.test`, password: PASSWORD })
    await prisma.tenantMembership.create({ data: { tenantId, userId: late.id } })
    const enabled = await Promise.all([change('enable'), change('enable')])
    expect(enabled.map(({ body }) => (body as { provisionedEnrollments: number }).provisionedEnrollments).sort()).toEqual([0, 1])
    expect(await prisma.enrollment.count({ where: { tenantProgramId: relation.id } })).toBe(4)
    expect(await prisma.auditEvent.count({ where: { entityId: relation.id, action: 'TENANT_PROGRAM_ENABLED' } })).toBe(2)
  })

  it('serializes invitation acceptance with enablement and exposes only the effective tenant catalog', async () => {
    const secondProgram = await prisma.program.create({
      data: { slug: `concurrent-program-${suffix}`, name: 'Programa Concorrente', summary: 'Disponível após entrada.' },
    })
    const version = await prisma.programVersion.create({
      data: { programId: secondProgram.id, versionNumber: 1, title: 'Publicação concorrente', description: 'Conteúdo publicado.', durationDays: 21 },
    })
    const phase = await prisma.programPhase.create({
      data: { programVersionId: version.id, key: 'inicio', title: 'Início', description: 'Primeira fase.', position: 1 },
    })
    await prisma.programActivity.create({
      data: { programVersionId: version.id, programPhaseId: phase.id, key: 'acao', title: 'Ação', description: 'Primeira ação.', position: 1, type: 'TASK', frequency: 'ONCE' },
    })
    await prisma.programVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })

    const invitationToken = app.get(InvitationTokenService).generate()
    const email = `concurrent-member-${suffix}@disciplina.test`
    await prisma.invitation.create({
      data: {
        tenantId,
        email,
        normalizedEmail: email,
        role: 'USER',
        tokenHash: invitationToken.hash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdByMembershipId: ceoMembershipId,
      },
    })
    const [enabled, accepted] = await Promise.all([
      request(app.getHttpServer() as Parameters<typeof request>[0])
        .put(`/api/platform/tenants/${tenantId}/programs/${secondProgram.id}/enable`)
        .set('Authorization', `Bearer ${token}`),
      request(app.getHttpServer() as Parameters<typeof request>[0])
        .post('/api/invitations/accept/new-identity')
        .send({ token: invitationToken.plainText, password: PASSWORD }),
    ])
    expect([enabled.status, accepted.status]).toEqual([200, 201])
    const membershipId = (accepted.body as { membershipId: string }).membershipId
    const relation = await prisma.tenantProgram.findUniqueOrThrow({ where: { tenantId_programId: { tenantId, programId: secondProgram.id } } })
    expect(await prisma.enrollment.count({ where: { tenantProgramId: relation.id, membershipId } })).toBe(1)

    const memberToken = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN).send({ email, password: PASSWORD }).expect(200)
      .then(({ body }) => (body as { accessToken: string }).accessToken)
    const catalog = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/programs').set('Authorization', `Bearer ${memberToken}`).set('X-Tenant-Id', tenantId).expect(200)
    expect((catalog.body as Array<{ id: string }>).map(({ id }) => id)).toEqual(expect.arrayContaining([programId, secondProgram.id]))
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/programs/${secondProgram.id}`).set('Authorization', `Bearer ${ceoToken}`).set('X-Tenant-Id', tenantId).expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ id: secondProgram.id, version: { phases: [{ key: 'inicio', activities: [{ key: 'acao' }] }] } }))

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .put(`/api/platform/tenants/${tenantId}/programs/${secondProgram.id}/disable`)
      .set('Authorization', `Bearer ${token}`).expect(200)
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/programs/${secondProgram.id}`).set('Authorization', `Bearer ${memberToken}`).set('X-Tenant-Id', tenantId).expect(404)
  })
})
