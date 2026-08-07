import { expect, test } from '@playwright/test'

const EMAIL = 'browser-e2e@disciplina.test'
const PASSWORD = 'browser e2e password with enough entropy'

test('restores the authenticated tenant and renders the remote catalog until logout', async ({ page, context }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha').fill(PASSWORD)
  const loginResponse = page.waitForResponse((response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST')
  const contextResponse = page.waitForResponse((response) => response.url().endsWith('/api/session') && response.request().method() === 'GET')
  await page.getByRole('button', { name: 'Entrar' }).click()
  const login = await loginResponse
  expect(login.status(), await login.text()).toBe(200)
  const session = await contextResponse
  expect(session.status()).toBe(200)
  expect((await session.json()).organizations[0].tenant.name).toBe('Organização E2E')

  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { name: /Bom dia/ })).toBeVisible()

  const catalogRequest = page.waitForRequest((request) => request.url().endsWith('/api/programs') && request.method() === 'GET')
  const catalogResponse = page.waitForResponse((response) => response.url().endsWith('/api/programs') && response.request().method() === 'GET')
  await page.getByRole('link', { name: 'Programas' }).click()
  expect((await catalogRequest).headers()['x-tenant-id']).toBeTruthy()
  expect((await catalogResponse).status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Projeto 66 — Ciclo fundador' })).toBeVisible()
  await page.getByRole('link', { name: /Entrar no programa/ }).click()
  await expect(page).toHaveURL(/\/app\/programas\/projeto-66$/)
  await expect(page.getByRole('navigation', { name: 'Navegação do Projeto 66' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Navegação do Projeto 66' })).toBeVisible()
  const restoredPage = await context.newPage()
  await restoredPage.goto('/app/programas')
  await expect(restoredPage.getByRole('heading', { name: 'Projeto 66 — Ciclo fundador' })).toBeVisible()
  await restoredPage.close()

  const csrf = (await context.cookies()).find(({ name }) => name.endsWith('dp_csrf'))
  expect(csrf).toBeTruthy()
  const logout = await page.request.post('/api/auth/logout', { headers: { Origin: 'http://localhost:5173', 'X-CSRF-Token': csrf.value } })
  expect(logout.status()).toBe(204)
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
})
