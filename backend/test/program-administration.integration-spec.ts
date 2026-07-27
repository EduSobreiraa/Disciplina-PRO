import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/database/prisma.service.js'
import { configureApp } from '../src/http/configure-app.js'
import { CreateUserUseCase } from '../src/modules/identity-access/application/create-user.use-case.js'

const ORIGIN = 'http://localhost:5173'
const PASSWORD = 'uma frase de catálogo global segura'

describe('Program administration integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let platformToken: string
  let regularToken: string
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    const users = app.get(CreateUserUseCase)
    const [platform] = await Promise.all([
      users.execute({ email: `program-platform-${suffix}@disciplina.test`, password: PASSWORD }),
      users.execute({ email: `program-regular-${suffix}@disciplina.test`, password: PASSWORD }),
    ])
    await prisma.platformAccess.create({ data: { userId: platform.id } })
    ;[platformToken, regularToken] = await Promise.all([
      login(`program-platform-${suffix}@disciplina.test`),
      login(`program-regular-${suffix}@disciplina.test`),
    ])
  })

  afterAll(async () => app.close())

  async function login(email: string) {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/auth/login').set('Origin', ORIGIN).send({ email, password: PASSWORD }).expect(200)
    return (response.body as { accessToken: string }).accessToken
  }

  function platform(method: 'post' | 'patch' | 'put', path: string, token = platformToken) {
    return request(app.getHttpServer() as Parameters<typeof request>[0])[method](`/api/platform${path}`)
      .set('Authorization', `Bearer ${token}`)
  }

  function definition(label: string) {
    return {
      title: `Projeto ${label}`,
      description: `Definição executável ${label}.`,
      durationDays: 66,
      phases: [{
        key: 'fundacao',
        title: 'Fundação',
        description: 'Primeira fase global.',
        position: 1,
        activities: [{
          key: 'ritual-diario',
          title: 'Ritual diário',
          description: 'Atividade diária genérica.',
          position: 1,
          type: 'CHECKLIST',
          frequency: 'DAILY',
          configuration: { itemCount: 3 },
        }],
      }],
    }
  }

  it('publishes exactly once, copies a successor, archives the previous version, and blocks archived programs', async () => {
    const slug = `program-${suffix}`
    const created = await platform('post', '/programs').send({
      slug,
      name: 'Programa Global',
      summary: 'Programa administrado pela plataforma.',
      version: definition('Inicial'),
    }).expect(201)
    const first = created.body as { id: string; programId: string }
    expect(created.body).toMatchObject({ versionNumber: 1, status: 'DRAFT', phases: [expect.objectContaining({ key: 'fundacao' })] })
    const firstTree = await prisma.programVersion.findUniqueOrThrow({
      where: { id: first.id },
      include: { phases: { include: { activities: true } } },
    })

    await platform('post', '/programs', regularToken).send({
      slug: `denied-${suffix}`,
      name: 'Negado',
      summary: 'Sem acesso de plataforma.',
      version: definition('Negado'),
    }).expect(403)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PLATFORM_ACCESS_DENIED' }))

    const publications = await Promise.all([
      platform('post', `/program-versions/${first.id}/publish`),
      platform('post', `/program-versions/${first.id}/publish`),
    ])
    expect(publications.map(({ status }) => status).sort()).toEqual([201, 409])
    expect(publications.find(({ status }) => status === 409)?.body).toMatchObject({ code: 'INVALID_PROGRAM_TRANSITION' })
    expect(await prisma.programVersion.count({ where: { programId: first.programId, status: 'PUBLISHED' } })).toBe(1)
    expect(await prisma.auditEvent.count({ where: { entityId: first.programId, action: 'PROGRAM_VERSION_PUBLISHED' } })).toBe(1)

    const versions = await Promise.all([
      platform('post', `/programs/${first.programId}/versions`),
      platform('post', `/programs/${first.programId}/versions`),
    ])
    expect(versions.map(({ status }) => status).sort()).toEqual([201, 409])
    const successor = versions.find(({ status }) => status === 201)?.body as { id: string; versionNumber: number }
    expect(successor).toMatchObject({ versionNumber: 2, status: 'DRAFT' })
    const successorTree = await prisma.programVersion.findUniqueOrThrow({
      where: { id: successor.id },
      include: { phases: { include: { activities: true } } },
    })
    expect(successorTree.phases[0]?.id).not.toBe(firstTree.phases[0]?.id)
    expect(successorTree.phases[0]?.activities[0]?.id).not.toBe(firstTree.phases[0]?.activities[0]?.id)

    await platform('put', `/program-versions/${successor.id}`).send(definition('Sucessor')).expect(200)
    await platform('post', `/program-versions/${successor.id}/publish`).expect(201)
    expect(await prisma.programVersion.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({ status: 'ARCHIVED', archivedAt: expect.any(Date) as Date })
    expect(await prisma.programVersion.findUniqueOrThrow({ where: { id: successor.id } })).toMatchObject({ status: 'PUBLISHED' })

    await platform('post', `/programs/${first.programId}/archive`).expect(201)
    await platform('patch', `/programs/${first.programId}`).send({
      slug,
      name: 'Mutação negada',
      summary: 'Programa arquivado.',
    }).expect(409)
    await platform('post', `/programs/${first.programId}/versions`).expect(409)
  })

  it('rejects duplicate slugs and incomplete publication with stable errors', async () => {
    const slug = `program-validation-${suffix}`
    await platform('post', '/programs').send({
      slug,
      name: 'Programa em validação',
      summary: 'Programa sem árvore publicável.',
      version: { ...definition('Vazio'), phases: [] },
    }).expect(201)
    const stored = await prisma.program.findUniqueOrThrow({ where: { slug }, include: { versions: true } })
    await platform('post', '/programs').send({
      slug,
      name: 'Programa duplicado',
      summary: 'Deve falhar por slug.',
      version: definition('Duplicado'),
    }).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PROGRAM_SLUG_ALREADY_EXISTS' }))
    await platform('post', `/program-versions/${stored.versions[0]?.id}/publish`).expect(409)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'PROGRAM_VERSION_NOT_PUBLISHABLE' }))
  })
})
