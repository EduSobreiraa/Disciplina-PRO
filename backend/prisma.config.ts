import { config as loadEnvironment } from 'dotenv'
import { resolve } from 'node:path'
import { defineConfig } from 'prisma/config'

loadEnvironment({ path: resolve(import.meta.dirname, '../.env'), quiet: true })

const databaseUrl =
  process.env.DATABASE_URL ??
  `postgresql://${encodeURIComponent(process.env.POSTGRES_USER ?? 'disciplina_pro')}:${encodeURIComponent(process.env.POSTGRES_PASSWORD ?? 'change_me')}@localhost:${process.env.POSTGRES_PORT ?? '5432'}/${encodeURIComponent(process.env.POSTGRES_DB ?? 'disciplina_pro')}`

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: databaseUrl },
})
