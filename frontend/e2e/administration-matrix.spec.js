import { expect, test } from './authenticated-test.js'

test.describe('USER', () => {
  test('cannot open tenant or platform administration', async ({ page }) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/app$/)
  await page.goto('/app/administracao')
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('link', { name: 'Administração' })).toHaveCount(0)
  await page.goto('/plataforma')
  await expect(page).toHaveURL(/\/app$/)
  })
})

test.describe('MANAGER', () => {
  test.use({ e2eRole: 'manager' })

  test('sees only managed team and no structural controls', async ({ page }) => {
  await page.goto('/app')
  await page.getByRole('link', { name: 'Administração' }).click()
  await expect(page).toHaveURL(/\/app\/administracao$/)
  await expect(page.getByRole('heading', { name: 'Somente equipes atribuídas' })).toBeVisible()
  await expect(page.getByLabel('Novo time')).toHaveCount(0)
  const scope = page.getByLabel('Escopo dos indicadores')
  await expect(scope).toHaveValue(/.+/)
  await expect(scope.locator('option')).toHaveText(['Equipe Gerenciada E2E'])
  await expect(page.getByText('Equipe Exclusiva CEO E2E')).toHaveCount(0)
  })
})

test.describe('CEO', () => {
  test.use({ e2eRole: 'ceo' })

  test('performs a tenant-scoped team mutation and retains full scope', async ({ page }) => {
  await page.goto('/app')
  await page.getByRole('link', { name: 'Administração' }).click()
  const teamName = `Equipe Browser ${Date.now()}`
  await page.getByLabel('Novo time').fill(teamName)
  const mutation = page.waitForResponse((response) => response.url().endsWith('/api/teams') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Criar', exact: true }).click()
  const response = await mutation
  expect(response.status(), await response.text()).toBe(201)
  expect(response.request().headers()['x-tenant-id']).toBeTruthy()
  await expect(page.locator('.admin-list strong').filter({ hasText: teamName })).toBeVisible()
  await expect(page.getByLabel('Escopo dos indicadores').locator('option').first()).toHaveText('Toda a organização')
  })
})

test.describe('SUPER_ADMIN', () => {
  test.use({ e2eRole: 'platform' })

  test('operates only through platform boundary without tenant header', async ({ page }) => {
  const tenantProjection = page.waitForResponse((response) => response.url().endsWith('/api/platform/tenants') && response.request().method() === 'GET')
  const programProjection = page.waitForResponse((response) => response.url().endsWith('/api/platform/programs') && response.request().method() === 'GET')
  await page.goto('/plataforma')
  for (const response of [await tenantProjection, await programProjection]) {
    expect(response.status()).toBe(200)
    expect(response.request().headers()['x-tenant-id']).toBeUndefined()
  }
  await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible()
  await expect(page.locator('.platform-list strong').filter({ hasText: 'Organização E2E' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Programas por tenant' })).toBeVisible()

  const suffix = Date.now().toString(36)
  await page.getByLabel('Nome').fill(`Tenant Browser ${suffix}`)
  await page.getByLabel('Slug').fill(`tenant-browser-${suffix}`)
  const create = page.waitForResponse((response) => response.url().endsWith('/api/platform/tenants') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Criar pendente' }).click()
  const created = await create
  expect(created.status(), await created.text()).toBe(201)
  expect(created.request().headers()['x-tenant-id']).toBeUndefined()
  await expect(page.locator('.platform-list strong').filter({ hasText: `Tenant Browser ${suffix}` })).toBeVisible()
  })
})
