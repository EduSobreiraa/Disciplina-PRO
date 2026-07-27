import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase de memberships segura'
const REASON = { reason: 'Decisão organizacional confirmada' }

describe('Membership administration integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let teamId: string
  let ceoMembershipId: string
  let managerMembershipId: string
  let scopedMembershipId: string
  let outsideMembershipId: string
  let successorOneId: string
  let successorTwoId: string
  let otherMembershipId: string
  let platformAccessId: string
  let ceoToken: string
  let managerToken: string
  let platformToken: string
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const users = app.get(CreateUserUseCase)
    const emails = ['ceo', 'manager', 'scoped', 'outside', 'successor-one', 'successor-two', 'other', 'platform']
      .map((name) => `membership-${name}-${suffix}@disciplina.test`)
    const createdUsers = await Promise.all(emails.map((email) => users.execute({ email, password: PASSWORD })))
    const [ceo, manager, scoped, outside, successorOne, successorTwo, other, platform] = createdUsers
    if (!ceo || !manager || !scoped || !outside || !successorOne || !successorTwo || !other || !platform) throw new Error('Fixture incompleta')
    const [tenant, otherTenant] = await Promise.all([
      prisma.tenant.create({ data: { name: 'Membership Tenant', slug: `membership-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'Membership Other', slug: `membership-other-${suffix}`, status: 'ACTIVE' } }),
    ])
    tenantId = tenant.id
    const memberships = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId, userId: ceo.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: manager.id, role: 'MANAGER' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: scoped.id, role: 'USER' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: outside.id, role: 'USER' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: successorOne.id, role: 'MANAGER' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: successorTwo.id, role: 'USER' } }),
      prisma.tenantMembership.create({ data: { tenantId: otherTenant.id, userId: other.id, role: 'USER' } }),
    ])
    ;[ceoMembershipId, managerMembershipId, scopedMembershipId, outsideMembershipId, successorOneId, successorTwoId, otherMembershipId] = memberships.map(({ id }) => id)
    teamId = (await prisma.team.create({ data: { tenantId, name: 'Time gerenciado', normalizedName: 'time gerenciado' } })).id
    await Promise.all([
      prisma.teamMembership.create({ data: { tenantId, teamId, membershipId: managerMembershipId, role: 'MANAGER' } }),
      prisma.teamMembership.create({ data: { tenantId, teamId, membershipId: scopedMembershipId, role: 'MEMBER' } }),
    ])
    platformAccessId = (await prisma.platformAccess.create({ data: { userId: platform.id } })).id
    ceoToken = await login(emails[0])
    managerToken = await login(emails[1])
    platformToken = await login(emails[7])
  })

  afterAll(async () => app.close())

  async function login(email: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN).send({ email, password: PASSWORD }).expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function tenantApi(method: 'get' | 'post' | 'patch', path: string, token = ceoToken) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])[method](`/api${path}`)
      .set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', tenantId)
  }

  function platformReplace(successorMembershipId: string) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/api/platform/tenants/${tenantId}/ceo`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ expectedCeoMembershipId: ceoMembershipId, successorMembershipId, reason: REASON.reason })
  }

  it('limits Manager listing and lifecycle actions to a currently managed team', async () => {
    const listing = await tenantApi('get', '/memberships', managerToken).expect(200)
    const visible = (listing.body as Array<{ id: string }>).map(({ id }) => id)
    expect(visible).toContain(scopedMembershipId)
    expect(visible).not.toContain(outsideMembershipId)
    await tenantApi('patch', `/memberships/${outsideMembershipId}/inactivate`, managerToken).send(REASON).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'RESOURCE_SCOPE_DENIED' }))
    await tenantApi('patch', `/memberships/${scopedMembershipId}/inactivate`, managerToken).send(REASON).expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ status: 'INACTIVE' }))
    expect(await prisma.teamMembership.findFirstOrThrow({ where: { teamId, membershipId: scopedMembershipId } })).toMatchObject({ endedAt: expect.any(Date) as Date })
    await tenantApi('patch', `/memberships/${scopedMembershipId}/reactivate`, managerToken).send(REASON).expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ status: 'ACTIVE' }))
    expect(await prisma.teamMembership.findFirstOrThrow({ where: { teamId, membershipId: scopedMembershipId } })).toMatchObject({ endedAt: expect.any(Date) as Date })
  })

  it('assigns, ends, and reactivates the same team relationship without duplicate rows', async () => {
    await tenantApi('post', `/teams/${teamId}/memberships`).send({ membershipId: outsideMembershipId, role: 'MANAGER' }).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'INVALID_TEAM_MEMBERSHIP_ASSIGNMENT' }))
    await tenantApi('patch', `/memberships/${outsideMembershipId}/role`).send({ role: 'MANAGER' }).expect(200)
    const assigned = await tenantApi('post', `/teams/${teamId}/memberships`).send({ membershipId: outsideMembershipId, role: 'MANAGER' }).expect(201)
    const assignmentId = (assigned.body as { id: string }).id
    await tenantApi('patch', `/teams/${teamId}/memberships/${outsideMembershipId}/end`).expect(200)
    const reassigned = await tenantApi('post', `/teams/${teamId}/memberships`).send({ membershipId: outsideMembershipId, role: 'MANAGER' }).expect(201)
    expect((reassigned.body as { id: string }).id).toBe(assignmentId)
    expect(await prisma.teamMembership.count({ where: { teamId, membershipId: outsideMembershipId } })).toBe(1)
  })

  it('removes Manager scope when CEO downgrades the tenant role', async () => {
    await tenantApi('patch', `/memberships/${outsideMembershipId}/role`).send({ role: 'USER' }).expect(200)
    expect(await prisma.teamMembership.findFirstOrThrow({ where: { teamId, membershipId: outsideMembershipId } })).toMatchObject({ role: 'MEMBER', endedAt: null })
  })

  it('suspends and reactivates without rewriting team assignments', async () => {
    const program = await prisma.program.create({
      data: { slug: `reactivation-${suffix}`, name: 'Programa de Reativação', summary: 'Oferta criada ao reativar.' },
    })
    const version = await prisma.programVersion.create({
      data: { programId: program.id, versionNumber: 1, title: 'Versão publicada', description: 'Programa ativo.', durationDays: 7 },
    })
    await prisma.programVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
    const tenantProgram = await prisma.tenantProgram.create({ data: { tenantId, programId: program.id } })
    const startedAt = new Date()
    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId,
        tenantProgramId: tenantProgram.id,
        programId: program.id,
        membershipId: outsideMembershipId,
        programVersionId: version.id,
        status: 'ACTIVE',
        timeZone: 'America/Bahia',
        startedAt,
        startedOn: startedAt,
      },
    })

    await tenantApi('patch', `/memberships/${outsideMembershipId}/suspend`).send(REASON).expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ status: 'SUSPENDED' }))
    expect(await prisma.teamMembership.findFirstOrThrow({ where: { teamId, membershipId: outsideMembershipId } })).toMatchObject({ endedAt: null })
    expect(await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).toMatchObject({ status: 'PAUSED' })
    expect(await prisma.enrollmentPauseCause.findFirstOrThrow({ where: { enrollmentId: enrollment.id, source: 'MEMBERSHIP' } })).toMatchObject({
      sourceReferenceId: outsideMembershipId,
      resolvedAt: null,
      createdByMembershipId: ceoMembershipId,
    })
    await tenantApi('patch', `/memberships/${outsideMembershipId}/reactivate`).send(REASON).expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ status: 'ACTIVE', suspendedAt: null }))
    expect(await prisma.enrollment.count({ where: { tenantProgramId: tenantProgram.id, membershipId: outsideMembershipId } })).toBe(1)
    expect(await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).toMatchObject({ status: 'PAUSED' })
    expect(await prisma.enrollmentPauseCause.findFirstOrThrow({ where: { enrollmentId: enrollment.id, source: 'MEMBERSHIP' } })).toMatchObject({ resolvedAt: null })
  })

  it('does not reveal a membership belonging to another tenant', async () => {
    await tenantApi('patch', `/memberships/${otherMembershipId}/inactivate`).send(REASON).expect(404)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'RESOURCE_NOT_FOUND' }))
  })

  it('replaces CEO atomically and rejects the concurrent stale replacement', async () => {
    const predecessorLink = await prisma.teamMembership.create({ data: { tenantId, teamId, membershipId: ceoMembershipId, role: 'MEMBER' } })
    const results = await Promise.all([platformReplace(successorOneId), platformReplace(successorTwoId)])
    expect(results.map(({ status }) => status).sort()).toEqual([200, 409])
    const winner = results.find(({ status }) => status === 200)
    const winnerId = (winner?.body as { id: string }).id
    expect([successorOneId, successorTwoId]).toContain(winnerId)
    expect(await prisma.tenantMembership.count({ where: { tenantId, role: 'CEO', status: 'ACTIVE' } })).toBe(1)
    expect(await prisma.tenantMembership.findUniqueOrThrow({ where: { id: ceoMembershipId } })).toMatchObject({ status: 'INACTIVE', deactivatedAt: expect.any(Date) as Date })
    expect(await prisma.teamMembership.findUniqueOrThrow({ where: { id: predecessorLink.id } })).toMatchObject({ endedAt: expect.any(Date) as Date })
    expect(await prisma.auditEvent.count({ where: { tenantId, actorPlatformAccessId: platformAccessId, action: 'TENANT_CEO_REPLACED' } })).toBe(1)
  })
})
