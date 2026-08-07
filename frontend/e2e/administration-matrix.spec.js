import { expect, test } from '@playwright/test'

const PASSWORD = 'browser e2e password with enough entropy'
const credentials = {
  user: 'browser-e2e@disciplina.test',
  manager: 'browser-manager-e2e@disciplina.test',
  ceo: 'browser-ceo-e2e@disciplina.test',
  platform: 'browser-platform-e2e@disciplina.test',
}

async function login(page, email, expectedPath) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(new RegExp(`${expectedPath}$`))
}

test('USER cannot open tenant or platform administration', async ({ page }) => {
  await login(page, credentials.user, '/app')
  await page.goto('/app/administracao')
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('link', { name: 'Administração' })).toHaveCount(0)
  await page.goto('/plataforma')
  await expect(page).toHaveURL(/\/app$/)
})

test('MANAGER sees only the managed team and no structural controls', async ({ page }) => {
  await login(page, credentials.manager, '/app')
  await page.getByRole('link', { name: 'Administração' }).click()
  await expect(page).toHaveURL(/\/app\/administracao$/)
  await expect(page.getByRole('heading', { name: 'Somente equipes atribuídas' })).toBeVisible()
  await expect(page.getByLabel('Novo time')).toHaveCount(0)
  const scope = page.getByLabel('Escopo dos indicadores')
  await expect(scope).toHaveValue(/.+/)
  await expect(scope.locator('option')).toHaveText(['Equipe Gerenciada E2E'])
  await expect(page.getByText('Equipe Exclusiva CEO E2E')).toHaveCount(0)
})

test('CEO performs a tenant-scoped team mutation and retains the full scope', async ({ page }) => {
  await login(page, credentials.ceo, '/app')
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

test('SUPER_ADMIN operates only through the platform boundary without tenant header', async ({ page }) => {
  const tenantProjection = page.waitForResponse((response) => response.url().endsWith('/api/platform/tenants') && response.request().method() === 'GET')
  const programProjection = page.waitForResponse((response) => response.url().endsWith('/api/platform/programs') && response.request().method() === 'GET')
  await login(page, credentials.platform, '/plataforma')
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
