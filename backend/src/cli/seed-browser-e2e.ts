import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from '../app.module.js'
import type { Environment } from '../config/environment.js'
import { PrismaService } from '../database/prisma.service.js'
import { CreateUserUseCase } from '../modules/identity-access/application/create-user.use-case.js'
import { MaterializeBundledProgramUseCase } from '../modules/programs/application/materialize-bundled-program.use-case.js'
import { EnableTenantProgramUseCase } from '../modules/programs/application/tenant-program-administration.use-cases.js'
import { PROJETO66_CATALOG } from '../modules/programs/catalog/projeto66.definition.js'
import { assertBrowserE2EDatabase } from './browser-e2e-fixture.js'

const EMAIL = 'browser-e2e@disciplina.test'
const CEO_EMAIL = 'browser-ceo-e2e@disciplina.test'
const MANAGER_EMAIL = 'browser-manager-e2e@disciplina.test'
const PLATFORM_EMAIL = 'browser-platform-e2e@disciplina.test'
const PASSWORD = 'browser e2e password with enough entropy'
const TENANT_SLUG = 'browser-e2e-tenant'

const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
try {
  const databaseUrl = app.get(ConfigService<Environment, true>).get('DATABASE_URL', { infer: true })
  const nodeEnvironment = app.get(ConfigService<Environment, true>).get('NODE_ENV', { infer: true })
  assertBrowserE2EDatabase({ databaseUrl, nodeEnvironment, resetConfirmation: process.env.E2E_DATABASE_RESET })

  const prisma = app.get(PrismaService)
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users", "tenants", "programs" CASCADE')
  const users = app.get(CreateUserUseCase)
  async function ensureUser(email: string) {
    return await prisma.user.findUnique({ where: { normalizedEmail: email }, select: { id: true, email: true } })
      ?? users.execute({ email, password: PASSWORD })
  }
  const [user, ceo, manager, platformUser] = await Promise.all([
    ensureUser(EMAIL), ensureUser(CEO_EMAIL), ensureUser(MANAGER_EMAIL), ensureUser(PLATFORM_EMAIL),
  ])
  await prisma.platformAccess.updateMany({ where: { userId: user.id }, data: { status: 'SUSPENDED', suspendedAt: new Date() } })
  const access = await prisma.platformAccess.upsert({
    where: { userId: platformUser.id },
    create: { userId: platformUser.id, role: 'SUPER_ADMIN', status: 'ACTIVE' },
    update: { status: 'ACTIVE', suspendedAt: null },
  })
  const context = { platformAccessId: access.id, userId: platformUser.id, platformRole: access.role }
  const program = await app.get(MaterializeBundledProgramUseCase).execute(context, PROJETO66_CATALOG)
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    create: { name: 'Organização E2E', slug: TENANT_SLUG, status: 'ACTIVE', timeZone: 'America/Bahia' },
    update: { name: 'Organização E2E', status: 'ACTIVE', suspendedAt: null, closedAt: null },
  })
  const participantMembership = await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    create: { tenantId: tenant.id, userId: user.id, role: 'USER', status: 'ACTIVE' },
    update: { status: 'ACTIVE', suspendedAt: null, deactivatedAt: null },
  })
  await prisma.tenantMembership.updateMany({ where: { tenantId: tenant.id, role: 'CEO', userId: { not: ceo.id } }, data: { role: 'USER' } })
  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: ceo.id } },
    create: { tenantId: tenant.id, userId: ceo.id, role: 'CEO', status: 'ACTIVE' },
    update: { role: 'CEO', status: 'ACTIVE', suspendedAt: null, deactivatedAt: null },
  })
  const managerMembership = await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: manager.id } },
    create: { tenantId: tenant.id, userId: manager.id, role: 'MANAGER', status: 'ACTIVE' },
    update: { role: 'MANAGER', status: 'ACTIVE', suspendedAt: null, deactivatedAt: null },
  })
  async function ensureTeam(name: string) {
    const existing = await prisma.team.findFirst({ where: { tenantId: tenant.id, normalizedName: name.toLocaleLowerCase('pt-BR') } })
    return existing ?? prisma.team.create({ data: { tenantId: tenant.id, name, normalizedName: name.toLocaleLowerCase('pt-BR') } })
  }
  const managedTeam = await ensureTeam('Equipe Gerenciada E2E')
  await ensureTeam('Equipe Exclusiva CEO E2E')
  await prisma.teamMembership.upsert({
    where: { teamId_membershipId: { teamId: managedTeam.id, membershipId: managerMembership.id } },
    create: { tenantId: tenant.id, teamId: managedTeam.id, membershipId: managerMembership.id, role: 'MANAGER' },
    update: { role: 'MANAGER', endedAt: null },
  })
  await prisma.teamMembership.upsert({
    where: { teamId_membershipId: { teamId: managedTeam.id, membershipId: participantMembership.id } },
    create: { tenantId: tenant.id, teamId: managedTeam.id, membershipId: participantMembership.id, role: 'MEMBER' },
    update: { role: 'MEMBER', endedAt: null },
  })
  await app.get(EnableTenantProgramUseCase).execute(context, tenant.id, program.programId)
  process.stdout.write('Fixture Playwright preparada em banco descartável.\n')
} finally {
  await app.close()
}
