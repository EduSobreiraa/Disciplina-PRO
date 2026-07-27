import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { Prisma } from '../src/generated/prisma/client.js'
import { AuditWriter } from '../src/modules/audit/application/audit-writer.js'
import type { InternalEventEnvelope } from '../src/modules/events/application/internal-event.contracts.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase de auditoria segura'

describe('Audit integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let foreignTenantId: string
  let teamId: string
  let foreignTeamId: string
  let memberMembershipId: string
  let ceoToken: string
  let managerToken: string
  let memberToken: string
  const suffix = randomUUID()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const users = app.get(CreateUserUseCase)
    const emails = ['ceo', 'manager', 'member', 'outside', 'foreign'].map((role) => `audit-${role}-${suffix}@test.invalid`)
    const [ceo, manager, member, outside, foreign] = await Promise.all(
      emails.map((email) => users.execute({ email, password: PASSWORD })),
    )
    if (!ceo || !manager || !member || !outside || !foreign) throw new Error('Fixture incompleta')

    const [tenant, foreignTenant] = await Promise.all([
      prisma.tenant.create({ data: { name: 'Audit', slug: `audit-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'Foreign audit', slug: `audit-foreign-${suffix}`, status: 'ACTIVE' } }),
    ])
    tenantId = tenant.id
    foreignTenantId = foreignTenant.id
    const [ceoMembership, managerMembership, memberMembership, outsideMembership, foreignMembership] = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId, userId: ceo.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: manager.id, role: 'MANAGER' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: member.id, role: 'USER' } }),
      prisma.tenantMembership.create({ data: { tenantId, userId: outside.id, role: 'USER' } }),
      prisma.tenantMembership.create({ data: { tenantId: foreignTenant.id, userId: foreign.id, role: 'USER' } }),
    ])
    memberMembershipId = memberMembership.id
    const [team, foreignTeam] = await Promise.all([
      prisma.team.create({ data: { tenantId, name: 'Managed', normalizedName: 'managed' } }),
      prisma.team.create({ data: { tenantId, name: 'Outside', normalizedName: 'outside' } }),
    ])
    teamId = team.id
    foreignTeamId = foreignTeam.id
    await Promise.all([
      prisma.teamMembership.create({ data: { tenantId, teamId, membershipId: managerMembership.id, role: 'MANAGER' } }),
      prisma.teamMembership.create({ data: { tenantId, teamId, membershipId: memberMembership.id } }),
      prisma.teamMembership.create({ data: { tenantId, teamId: foreignTeam.id, membershipId: outsideMembership.id } }),
    ])
    await prisma.auditEvent.createMany({
      data: [
        {
          tenantId,
          actorType: 'MEMBERSHIP',
          actorMembershipId: memberMembership.id,
          entityType: 'Enrollment',
          entityId: randomUUID(),
          action: 'OBJECTIVE_MEMBER_EVENT',
          metadata: { privateResponse: 'não pode sair', objectiveCount: 1 },
        },
        {
          tenantId,
          actorType: 'MEMBERSHIP',
          actorMembershipId: ceoMembership.id,
          targetMembershipId: memberMembership.id,
          entityType: 'TenantMembership',
          entityId: memberMembership.id,
          action: 'MEMBER_TARGETED_EVENT',
          metadata: { reason: 'texto administrativo livre' },
        },
        {
          tenantId,
          actorType: 'MEMBERSHIP',
          actorMembershipId: outsideMembership.id,
          entityType: 'Enrollment',
          entityId: randomUUID(),
          action: 'OUTSIDE_TEAM_EVENT',
          metadata: {},
        },
        {
          tenantId: foreignTenant.id,
          actorType: 'MEMBERSHIP',
          actorMembershipId: foreignMembership.id,
          entityType: 'Enrollment',
          entityId: randomUUID(),
          action: 'FOREIGN_TENANT_EVENT',
          metadata: { secret: 'foreign' },
        },
      ],
    })
    ceoToken = await login(emails[0])
    managerToken = await login(emails[1])
    memberToken = await login(emails[2])
  })

  afterAll(async () => app.close())

  it('returns only the current membership events without raw metadata', async () => {
    const response = await api('/me?page=1&limit=10', memberToken).expect(200)
    expect(response.body).toMatchObject({ page: 1, limit: 10, total: 2 })
    const serialized = JSON.stringify(response.body)
    expect(serialized).toContain('OBJECTIVE_MEMBER_EVENT')
    expect(serialized).toContain('MEMBER_TARGETED_EVENT')
    expect(serialized).not.toContain('OUTSIDE_TEAM_EVENT')
    expect(serialized).not.toContain('privateResponse')
    expect(serialized).not.toContain('texto administrativo livre')
    expect(serialized).not.toContain('metadata')
  })

  it('limits team audit to an actively managed team and lets CEO read any team', async () => {
    const scoped = await api(`/teams/${teamId}`, managerToken).expect(200)
    expect(JSON.stringify(scoped.body)).toContain('OBJECTIVE_MEMBER_EVENT')
    expect(JSON.stringify(scoped.body)).not.toContain('OUTSIDE_TEAM_EVENT')
    await api(`/teams/${foreignTeamId}`, managerToken).expect(404)
    await api(`/teams/${foreignTeamId}`, ceoToken).expect(200)
    await api(`/teams/${teamId}`, memberToken).expect(403)
  })

  it('allows only CEO to read the tenant and never crosses tenantId', async () => {
    await api('/tenant', managerToken).expect(403)
    const response = await api('/tenant', ceoToken).expect(200)
    const serialized = JSON.stringify(response.body)
    expect(serialized).toContain('OUTSIDE_TEAM_EVENT')
    expect(serialized).not.toContain('FOREIGN_TENANT_EVENT')
    expect(serialized).not.toContain(foreignTenantId)
  })

  it('records an event-derived audit once and keeps it immutable', async () => {
    const internalEvent = await prisma.internalEvent.create({
      data: {
        tenantId,
        type: `audit.test.${suffix}`,
        version: 1,
        aggregateType: 'Enrollment',
        aggregateId: randomUUID(),
        sourceKey: `audit-derived:${suffix}`,
        payload: {},
        occurredAt: new Date(),
      },
    })
    const envelope = internalEvent as InternalEventEnvelope
    const writer = app.get<AuditWriter<Prisma.TransactionClient>>(AuditWriter)
    await prisma.$transaction(async (transaction) => {
      const fact = { entityType: 'Enrollment', entityId: internalEvent.aggregateId, action: 'DERIVED_OBJECTIVE_EVENT', targetMembershipId: memberMembershipId }
      await writer.recordDerived(transaction, envelope, fact)
      await writer.recordDerived(transaction, envelope, fact)
    })
    const audit = await prisma.auditEvent.findUniqueOrThrow({ where: { internalEventId: internalEvent.id } })
    expect(audit).toMatchObject({ tenantId, actorType: 'SYSTEM', targetMembershipId: memberMembershipId, metadata: {} })
    expect(await prisma.auditEvent.count({ where: { internalEventId: internalEvent.id } })).toBe(1)
    await expect(prisma.auditEvent.update({ where: { id: audit.id }, data: { action: 'ALTERED' } })).rejects.toBeDefined()
    await expect(prisma.auditEvent.delete({ where: { id: audit.id } })).rejects.toBeDefined()
  })

  it('validates pagination at the HTTP boundary', async () => {
    await api('/me?page=0&limit=101', memberToken).expect(400)
  })

  async function login(email: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email, password: PASSWORD })
      .expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function api(path: string, token: string) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/audit${path}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
  }
})
