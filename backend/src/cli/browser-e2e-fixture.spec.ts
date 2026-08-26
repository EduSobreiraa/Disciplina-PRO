import { BROWSER_E2E_RESET_CONFIRMATION, assertBrowserE2EDatabase } from './browser-e2e-fixture.js'

describe('assertBrowserE2EDatabase', () => {
  const confirmation = BROWSER_E2E_RESET_CONFIRMATION

  it('accepts only confirmed local disposable databases in test', () => {
    expect(() => assertBrowserE2EDatabase({
      databaseUrl: 'postgresql://disciplina_pro:test_password@localhost:5432/disciplina_pro_test',
      nodeEnvironment: 'test',
      resetConfirmation: confirmation,
    })).not.toThrow()
  })

  it.each([
    { databaseUrl: 'postgresql://disciplina_pro:test_password@localhost:5432/disciplina_pro', nodeEnvironment: 'test', resetConfirmation: confirmation },
    { databaseUrl: 'postgresql://disciplina_pro:test_password@staging.example:5432/disciplina_pro_test', nodeEnvironment: 'test', resetConfirmation: confirmation },
    { databaseUrl: 'postgresql://disciplina_pro:test_password@localhost:5432/disciplina_pro_test', nodeEnvironment: 'production', resetConfirmation: confirmation },
    { databaseUrl: 'postgresql://disciplina_pro:test_password@localhost:5432/disciplina_pro_test', nodeEnvironment: 'test', resetConfirmation: undefined },
  ])('rejects unsafe reset target %#', (environment) => {
    expect(() => assertBrowserE2EDatabase(environment)).toThrow('Fixture Playwright')
  })
})
