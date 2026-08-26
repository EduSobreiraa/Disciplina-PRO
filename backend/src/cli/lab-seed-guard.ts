export const LAB_SEED_CONFIRMATION = 'seed-disciplina-pro-lab'

const disposableDatabaseNames = /^disciplina_pro_(?:lab|staging|validation)$/i

export function assertLabSeedDatabase({ databaseUrl, confirmation }: {
  databaseUrl: string
  confirmation?: string
}) {
  if (confirmation !== LAB_SEED_CONFIRMATION) throw new Error('Seed de laboratório exige confirmação explícita')

  const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1))
  if (!disposableDatabaseNames.test(databaseName)) {
    throw new Error('Seed de laboratório exige banco disciplina_pro_lab, disciplina_pro_staging ou disciplina_pro_validation')
  }
}
