import { Controller, Get, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'
import type { CurrentPlatformContext, CurrentTenantContext } from '../src/modules/organizations/application/organization-context.repository.js'
import { TENANT_PERMISSIONS } from '../src/modules/organizations/domain/tenant-permissions.js'
import { CurrentPlatform, CurrentTenant } from '../src/modules/organizations/http/current-organization-context.decorators.js'
import { PlatformRoute, RequireTenantPermissions, TenantRoute } from '../src/modules/organizations/http/organization-route.decorators.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase organizacional segura'

@TenantRoute()
@Controller('test/organizations')
class OrganizationGuardsProbeController {
  @Get('tenant')
  tenant(@CurrentTenant() context: CurrentTenantContext) {
    return context
  }

  @Get('scoped-members')
  @RequireTenantPermissions(TENANT_PERMISSIONS.MEMBERSHIP_READ_SCOPED)
  scopedMembers(@CurrentTenant() context: CurrentTenantContext) {
    return context
  }

  @Get('create-team')
  @RequireTenantPermissions(TENANT_PERMISSIONS.TEAM_CREATE)
  createTeam(@CurrentTenant() context: CurrentTenantContext) {
    return context
  }

  @Get('platform')
  @PlatformRoute()
  platform(@CurrentPlatform() context: CurrentPlatformContext) {
    return context
  }
}

describe('Organization guards integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantAId: string
  let tenantBId: string
  let suspendedTenantId: string
  let userMembershipId: string
  let platformAccessId: string
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const emails = {
    user: `org-user-${suffix}@disciplina.test`,
    manager: `org-manager-${suffix}@disciplina.test`,
    ceo: `org-ceo-${suffix}@disciplina.test`,
    platform: `org-platform-${suffix}@disciplina.test`,
  }
  const tokens: Record<keyof typeof emails, string> = { user: '', manager: '', ceo: '', platform: '' }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [OrganizationGuardsProbeController] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const users = app.get(CreateUserUseCase)
    const [user, manager, ceo, platform] = await Promise.all(
      Object.values(emails).map((email) => users.execute({ email, password: PASSWORD })),
    )
    const [tenantA, tenantB, suspendedTenant] = await Promise.all([
      prisma.tenant.create({ data: { name: 'Tenant A', slug: `tenant-a-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({ data: { name: 'Tenant B', slug: `tenant-b-${suffix}`, status: 'ACTIVE' } }),
      prisma.tenant.create({
        data: { name: 'Tenant suspenso', slug: `tenant-suspended-${suffix}`, status: 'SUSPENDED', suspendedAt: new Date() },
      }),
    ])
    tenantAId = tenantA.id
    tenantBId = tenantB.id
    suspendedTenantId = suspendedTenant.id
    const memberships = await Promise.all([
      prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: user.id, role: 'USER' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: manager.id, role: 'MANAGER' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: ceo.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId: tenantB.id, userId: ceo.id, role: 'CEO' } }),
      prisma.tenantMembership.create({ data: { tenantId: suspendedTenant.id, userId: user.id, role: 'USER' } }),
      prisma.tenantMembership.create({ data: { tenantId: suspendedTenant.id, userId: ceo.id, role: 'CEO' } }),
    ])
    userMembershipId = memberships[0].id
    const access = await prisma.platformAccess.create({ data: { userId: platform.id } })
    platformAccessId = access.id

    for (const [role, email] of Object.entries(emails) as Array<[keyof typeof emails, string]>) {
      const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
        .post('/api/auth/login')
        .set('Origin', ORIGIN)
        .send({ email, password: PASSWORD })
        .expect(200)
      tokens[role] = (response.body as { accessToken: string }).accessToken
    }
  })

  afterAll(async () => app.close())

  function get(path: string, token: string, tenantId?: string) {
    const call = request(app.getHttpServer() as Parameters<typeof request>[0]).get(`/api/test/organizations/${path}`).set('Authorization', `Bearer ${token}`)
    if (tenantId) call.set('X-Tenant-Id', tenantId)
    return call
  }

  it('establishes only a current, claims-independent tenant context', async () => {
    const response = await get('tenant', tokens.user, tenantAId).expect(200)
    expect(response.body).toMatchObject({ tenantId: tenantAId, membershipId: userMembershipId, tenantRole: 'USER' })
    expect(response.body).not.toHaveProperty('sessionId')
    expect(response.body).not.toHaveProperty('permissions')
  })

  it('rejects missing, malformed and inaccessible tenant selections with stable errors', async () => {
    await get('tenant', tokens.user).expect(400).expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_CONTEXT_REQUIRED' }))
    await get('tenant', tokens.user, 'not-a-uuid').expect(400).expect(({ body }) => expect(body).toMatchObject({ code: 'INVALID_TENANT_HEADER' }))
    await get('tenant', tokens.user, tenantBId).expect(403).expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_ACCESS_DENIED' }))
  })

  it('revalidates tenant and membership state on every request', async () => {
    await get('tenant', tokens.user, suspendedTenantId).expect(403)
    await prisma.tenantMembership.update({
      where: { id: userMembershipId },
      data: { status: 'SUSPENDED', suspendedAt: new Date() },
    })
    await get('tenant', tokens.user, tenantAId).expect(403)
    await prisma.tenantMembership.update({ where: { id: userMembershipId }, data: { status: 'ACTIVE', suspendedAt: null } })
    await get('tenant', tokens.user, tenantAId).expect(200)
  })

  it('enforces cumulative role capabilities before resource scope', async () => {
    await get('scoped-members', tokens.user, tenantAId).expect(403).expect(({ body }) => expect(body).toMatchObject({ code: 'PERMISSION_DENIED' }))
    await get('scoped-members', tokens.manager, tenantAId).expect(200)
    await get('create-team', tokens.manager, tenantAId).expect(403).expect(({ body }) => expect(body).toMatchObject({ code: 'PERMISSION_DENIED' }))
    await get('scoped-members', tokens.ceo, tenantAId).expect(200)
    await get('create-team', tokens.ceo, tenantAId).expect(200)
  })

  it('keeps platform access separate and never bypasses tenant membership', async () => {
    const platform = await get('platform', tokens.platform).expect(200)
    expect(platform.body).toMatchObject({ platformAccessId, platformRole: 'SUPER_ADMIN' })
    await get('platform', tokens.ceo).expect(403).expect(({ body }) => expect(body).toMatchObject({ code: 'PLATFORM_ACCESS_DENIED' }))
    await get('tenant', tokens.platform, tenantAId).expect(403).expect(({ body }) => expect(body).toMatchObject({ code: 'TENANT_ACCESS_DENIED' }))

    await prisma.platformAccess.update({ where: { id: platformAccessId }, data: { status: 'SUSPENDED', suspendedAt: new Date() } })
    await get('platform', tokens.platform).expect(403)
  })
})
