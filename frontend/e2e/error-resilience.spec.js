import { expect, test } from './authenticated-test.js'

const apiFailures = [
  { status: 401, code: 'AUTHENTICATION_REQUIRED', message: 'Autenticação necessária' },
  { status: 403, code: 'TENANT_ACCESS_DENIED', message: 'Acesso ao tenant negado' },
  { status: 409, code: 'PROGRAM_STATE_CONFLICT', message: 'Estado do programa mudou' },
  { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Limite de requisições atingido' },
  { status: 503, code: 'INTERNAL_SERVER_ERROR', message: 'Serviço temporariamente indisponível' },
]

function isCatalogRead(route) {
  const request = route.request()
  return request.method() === 'GET' && new URL(request.url()).pathname === '/api/programs'
}

async function expectCatalogRecovery(page, handler) {
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o catálogo.')
  await page.unroute('**/*', handler)
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: 'Projeto 66 — Ciclo fundador' })).toBeVisible()
}

for (const failure of apiFailures) {
  test(`shows and recovers from HTTP ${failure.status} while loading the catalog`, async ({ page }) => {
    let intercepted = 0
    const failCatalog = (route) => {
      if (!isCatalogRead(route)) return route.continue()
      intercepted += 1
      return route.fulfill({
        status: failure.status,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: failure.status, code: failure.code, message: failure.message }),
      })
    }

    await page.route('**/*', failCatalog)
    await page.goto('/app/programas')

    await expect(page.getByRole('alert')).toContainText(failure.message)
    expect(intercepted).toBeGreaterThanOrEqual(failure.status === 401 ? 2 : 1)
    await expectCatalogRecovery(page, failCatalog)
  })
}

test('shows and recovers from a transport timeout while loading the catalog', async ({ page }) => {
  let intercepted = 0
  const timeoutCatalog = (route) => {
    if (!isCatalogRead(route)) return route.continue()
    intercepted += 1
    return route.abort('timedout')
  }

  await page.route('**/*', timeoutCatalog)
  await page.goto('/app/programas')

  expect(intercepted).toBeGreaterThan(0)
  await expectCatalogRecovery(page, timeoutCatalog)
})
