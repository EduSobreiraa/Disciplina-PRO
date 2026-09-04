import { expect, test } from '@playwright/test'

test('exposes the login boundary and the ready API through the deployed frontend', async ({ page }) => {
  const mutations = []
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutations.push(`${request.method()} ${request.url()}`)
  })

  const loginResponse = await page.goto('/login')

  expect(loginResponse?.ok()).toBe(true)
  await expect(page).toHaveURL(/\/login\/?$/)
  await expect(page.getByRole('heading', { name: /disciplina pro/i })).toBeVisible()
  await expect(page.getByLabel(/e-mail/i)).toBeVisible()
  await expect(page.getByLabel(/senha/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /entrar/i })).toBeEnabled()

  const readiness = await page.request.get('/api/health/ready')
  expect(readiness.ok()).toBe(true)
  await expect(readiness.json()).resolves.toMatchObject({
    status: 'ready',
    service: 'disciplina-pro-api',
    database: 'up',
  })

  expect(mutations, 'O smoke publico externo deve permanecer somente leitura.').toEqual([])
})
