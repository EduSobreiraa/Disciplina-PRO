import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from '../app.module.js'
import type { Environment } from '../config/environment.js'
import { PrismaService } from '../database/prisma.service.js'
import { BootstrapSuperAdminUseCase } from '../modules/identity-access/application/bootstrap-super-admin.use-case.js'
import { CreateUserUseCase } from '../modules/identity-access/application/create-user.use-case.js'
import { PasswordHasher } from '../modules/identity-access/application/password-hasher.js'
import { assertPasswordPolicy, normalizeEmail } from '../modules/identity-access/domain/identity-policy.js'
import { MaterializeBundledProgramUseCase } from '../modules/programs/application/materialize-bundled-program.use-case.js'
import { EnableTenantProgramUseCase } from '../modules/programs/application/tenant-program-administration.use-cases.js'
import { PROJETO66_CATALOG } from '../modules/programs/catalog/projeto66.definition.js'
import { assertLabSeedDatabase } from './lab-seed-guard.js'

const adminEmail = process.env.LAB_SEED_ADMIN_EMAIL ?? 'lab-superadmin@disciplina.test'
const ceoEmail = process.env.LAB_SEED_CEO_EMAIL ?? 'lab-ceo@disciplina.test'
const managerEmail = process.env.LAB_SEED_MANAGER_EMAIL ?? 'lab-manager@disciplina.test'
const userEmail = process.env.LAB_SEED_USER_EMAIL ?? 'lab-user@disciplina.test'
const password = process.env.LAB_SEED_PASSWORD
const tenantSlug = process.env.LAB_SEED_TENANT_SLUG ?? 'organizacao-laboratorio'

if (!password) throw new Error('LAB_SEED_PASSWORD é obrigatória')
const labSeedPassword = password

const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
try {
  const config = app.get(ConfigService<Environment, true>)
  const databaseUrl = config.get('DATABASE_URL', { infer: true })
  assertLabSeedDatabase({
    databaseUrl,
    confirmation: process.env.LAB_SEED_CONFIRM,
    defaultRailwayDatabaseConfirmation: process.env.LAB_SEED_ALLOW_DEFAULT_RAILWAY_DATABASE,
  })
  assertPasswordPolicy(labSeedPassword)

  const labEmails = [adminEmail, ceoEmail, managerEmail, userEmail]
  for (const email of labEmails) {
    if (!normalizeEmail(email).endsWith('@disciplina.test')) {
      throw new Error('As identidades da seed de laboratório devem usar o domínio descartável @disciplina.test')
    }
  }

  const prisma = app.get(PrismaService)
  const users = app.get(CreateUserUseCase)
  const passwordHasher = app.get(PasswordHasher)
  const passwordHash = await passwordHasher.hash(labSeedPassword.normalize('NFC'))
  async function ensureLabUser(email: string) {
    const normalizedEmail = normalizeEmail(email)
    const existing = await prisma.user.findUnique({ where: { normalizedEmail }, select: { id: true } })
    if (!existing) return users.execute({ email, password: labSeedPassword })

    return prisma.user.update({
      where: { id: existing.id },
      data: { email: email.trim(), passwordHash, status: 'ACTIVE', disabledAt: null },
      select: { id: true, email: true },
    })
  }

  const normalizedAdminEmail = normalizeEmail(adminEmail)
  const activePlatformAccess = await prisma.platformAccess.findFirst({
    where: { status: 'ACTIVE' },
    include: { user: { select: { id: true, email: true, normalizedEmail: true } } },
  })
  const platformContext = activePlatformAccess
    ? (() => {
        if (activePlatformAccess.user.normalizedEmail !== normalizedAdminEmail) {
          throw new Error('Já existe SUPER_ADMIN ativo que não pertence à seed de laboratório')
        }
        return {
          platformAccessId: activePlatformAccess.id,
          userId: activePlatformAccess.userId,
          platformRole: activePlatformAccess.role,
        }
      })()
    : await app.get(BootstrapSuperAdminUseCase).execute({ email: adminEmail, password: labSeedPassword }).then((bootstrap) => ({
        platformAccessId: bootstrap.platformAccessId,
        userId: bootstrap.userId,
        platformRole: 'SUPER_ADMIN' as const,
      }))

  await prisma.user.update({
    where: { id: platformContext.userId },
    data: { email: adminEmail.trim(), passwordHash, status: 'ACTIVE', disabledAt: null },
  })

  const [ceo, manager, user] = await Promise.all([
    ensureLabUser(ceoEmail),
    ensureLabUser(managerEmail),
    ensureLabUser(userEmail),
  ])
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    create: { name: 'Organização Laboratório', slug: tenantSlug, status: 'ACTIVE', timeZone: 'America/Bahia' },
    update: { name: 'Organização Laboratório', status: 'ACTIVE', suspendedAt: null, closedAt: null },
  })
  const allowedTenantEmails = new Set([normalizeEmail(ceoEmail), normalizeEmail(managerEmail), normalizeEmail(userEmail)])
  const foreignMembership = await prisma.tenantMembership.findFirst({
    where: { tenantId: tenant.id, status: 'ACTIVE', user: { normalizedEmail: { notIn: [...allowedTenantEmails] } } },
    select: { id: true },
  })
  if (foreignMembership) throw new Error('O tenant de laboratório possui membro ativo que não pertence à seed')

  async function ensureMembership(userId: string, role: 'CEO' | 'MANAGER' | 'USER') {
    return prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId } },
      create: { tenantId: tenant.id, userId, role, status: 'ACTIVE' },
      update: { role, status: 'ACTIVE', suspendedAt: null, deactivatedAt: null },
    })
  }

  const [, managerMembership, userMembership] = await Promise.all([
    ensureMembership(ceo.id, 'CEO'),
    ensureMembership(manager.id, 'MANAGER'),
    ensureMembership(user.id, 'USER'),
  ])

  const teamName = 'Equipe Gerenciada Laboratório'
  const normalizedTeamName = teamName.toLocaleLowerCase('pt-BR')
  const managedTeam = await prisma.team.findFirst({ where: { tenantId: tenant.id, normalizedName: normalizedTeamName } })
    ?? await prisma.team.create({ data: { tenantId: tenant.id, name: teamName, normalizedName: normalizedTeamName } })
  await Promise.all([
    prisma.teamMembership.upsert({
      where: { teamId_membershipId: { teamId: managedTeam.id, membershipId: managerMembership.id } },
      create: { tenantId: tenant.id, teamId: managedTeam.id, membershipId: managerMembership.id, role: 'MANAGER' },
      update: { role: 'MANAGER', endedAt: null },
    }),
    prisma.teamMembership.upsert({
      where: { teamId_membershipId: { teamId: managedTeam.id, membershipId: userMembership.id } },
      create: { tenantId: tenant.id, teamId: managedTeam.id, membershipId: userMembership.id, role: 'MEMBER' },
      update: { role: 'MEMBER', endedAt: null },
    }),
  ])
  const program = await app.get(MaterializeBundledProgramUseCase).execute(platformContext, PROJETO66_CATALOG)
  await app.get(EnableTenantProgramUseCase).execute(platformContext, tenant.id, program.programId)

  process.stdout.write(
    `Seed de laboratório pronta: ${tenant.slug}; SUPER_ADMIN ${adminEmail}; CEO ${ceoEmail}; MANAGER ${managerEmail}; USER ${userEmail}.\n`,
  )
} finally {
  await app.close()
}
