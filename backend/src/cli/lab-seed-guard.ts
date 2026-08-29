export const LAB_SEED_CONFIRMATION = 'seed-disciplina-pro-lab'
export const LAB_SEED_ALLOW_DEFAULT_RAILWAY_DATABASE = 'allow-temporary-railway-database'

const disposableDatabaseNames = /^disciplina_pro_(?:lab|staging|validation)$/i

export function assertLabSeedDatabase({ databaseUrl, confirmation, defaultRailwayDatabaseConfirmation }: {
  databaseUrl: string
  confirmation?: string
  defaultRailwayDatabaseConfirmation?: string
}) {
  if (confirmation !== LAB_SEED_CONFIRMATION) throw new Error('Seed de laboratório exige confirmação explícita')

  const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1))
  const isExplicitTemporaryRailwayDatabase = databaseName === 'railway'
    && defaultRailwayDatabaseConfirmation === LAB_SEED_ALLOW_DEFAULT_RAILWAY_DATABASE
  if (!disposableDatabaseNames.test(databaseName) && !isExplicitTemporaryRailwayDatabase) {
    throw new Error('Seed de laboratório exige banco disciplina_pro_lab, disciplina_pro_staging ou disciplina_pro_validation')
  }
}
