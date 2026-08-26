export const BROWSER_E2E_RESET_CONFIRMATION = 'reset-disciplina-pro-browser-e2e'

const disposableDatabaseNames = /^disciplina_pro_(?:test|e2e|validation)$/i
const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

export function assertBrowserE2EDatabase({ databaseUrl, nodeEnvironment, resetConfirmation }: {
  databaseUrl: string
  nodeEnvironment: string
  resetConfirmation?: string
}) {
  if (nodeEnvironment !== 'test') throw new Error('Fixture Playwright exige NODE_ENV=test')
  if (resetConfirmation !== BROWSER_E2E_RESET_CONFIRMATION) throw new Error('Fixture Playwright exige confirmação explícita de reset E2E')

  const url = new URL(databaseUrl)
  const databaseName = decodeURIComponent(url.pathname.slice(1))
  if (!disposableDatabaseNames.test(databaseName)) throw new Error('Fixture Playwright exige banco disciplina_pro_test, disciplina_pro_e2e ou disciplina_pro_validation')
  if (!localHosts.has(url.hostname)) throw new Error('Fixture Playwright só permite banco local descartável')
}
