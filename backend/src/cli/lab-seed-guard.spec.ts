import {
  assertLabSeedDatabase,
  LAB_SEED_ALLOW_DEFAULT_RAILWAY_DATABASE,
  LAB_SEED_CONFIRMATION,
} from './lab-seed-guard.js'

describe('assertLabSeedDatabase', () => {
  it('accepts an explicitly confirmed disposable lab database', () => {
    expect(() => assertLabSeedDatabase({
      databaseUrl: 'postgresql://lab:password@localhost:5432/disciplina_pro_lab',
      confirmation: LAB_SEED_CONFIRMATION,
    })).not.toThrow()
  })

  it('accepts Railway default database only with its additional confirmation', () => {
    expect(() => assertLabSeedDatabase({
      databaseUrl: 'postgresql://lab:password@railway.internal:5432/railway',
      confirmation: LAB_SEED_CONFIRMATION,
      defaultRailwayDatabaseConfirmation: LAB_SEED_ALLOW_DEFAULT_RAILWAY_DATABASE,
    })).not.toThrow()
  })

  it.each([
    { databaseUrl: 'postgresql://lab:password@localhost:5432/disciplina_pro', confirmation: LAB_SEED_CONFIRMATION },
    { databaseUrl: 'postgresql://lab:password@localhost:5432/disciplina_pro_staging', confirmation: undefined },
    { databaseUrl: 'postgresql://lab:password@railway.internal:5432/railway', confirmation: LAB_SEED_CONFIRMATION },
  ])('rejects a non-disposable target or missing confirmation', (input) => {
    expect(() => assertLabSeedDatabase(input)).toThrow('Seed de laboratório')
  })
})
