import { expect, test } from '@playwright/test'

const token = 'a'.repeat(43)
const password = 'Minha frase de teste segura'

test('public invitation creates an account without redirecting to login', async ({ page }) => {
  let payload
  await page.route('**/api/invitations/accept/new-identity', async (route) => {
    payload = route.request().postDataJSON()
    await route.fulfill({ status: 201, json: {} })
  })
  await page.goto(`/convites/aceitar#token=${token}`)
  await expect(page.getByRole('heading', { name: 'Aceitar convite' })).toBeVisible()
  await page.getByLabel('Crie sua senha').fill(password)
  await page.getByLabel('Confirme sua senha').fill(password)
  await page.getByRole('button', { name: 'Criar conta e aceitar convite' }).click()
  await expect(page.getByRole('status')).toContainText('Convite aceito!')
  expect(payload).toEqual({ token, password })
  await expect(page).toHaveURL(/\/convites\/aceitar$/)
  await expect(page.getByRole('link', { name: 'Entrar no Disciplina PRO' })).toHaveAttribute('href', '/login')
})

test('existing identity signs in on the invitation page and accepts using bearer authentication', async ({ page }) => {
  await page.route('**/api/invitations/accept/new-identity', (route) => route.fulfill({ status: 409, json: { code: 'EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED' } }))
  await page.route('**/api/auth/login', (route) => route.fulfill({ status: 200, json: { accessToken: 'test-access', expiresAt: '2099-01-01T00:00:00Z' } }))
  let payload
  let authorization
  await page.route('**/api/invitations/accept/existing-identity', async (route) => {
    payload = route.request().postDataJSON()
    authorization = route.request().headers().authorization
    await route.fulfill({ status: 201, json: {} })
  })
  await page.goto(`/convites/aceitar#token=${token}`)
  await page.getByLabel('Crie sua senha').fill(password)
  await page.getByLabel('Confirme sua senha').fill(password)
  await page.getByRole('button', { name: 'Criar conta e aceitar convite' }).click()
  await expect(page.getByRole('alert')).toContainText('já possui uma conta')
  await page.getByLabel('E-mail').fill('convidado@example.test')
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Aceitar convite', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Convite aceito!')
  expect(payload).toEqual({ token })
  expect(authorization).toBe('Bearer test-access')
  await expect(page.getByRole('link', { name: 'Entrar no Disciplina PRO' })).toHaveAttribute('href', '/app')
})

test('invalid link does not offer account creation', async ({ page }) => {
  await page.goto('/convites/aceitar')
  await expect(page.getByRole('alert')).toContainText('Link de convite inválido')
  await expect(page.getByRole('button', { name: 'Criar conta e aceitar convite' })).toHaveCount(0)
})

test('invitation form fits a narrow screen and supports keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto(`/convites/aceitar#token=${token}`)
  await expect(page.getByLabel('Crie sua senha')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Crie sua senha')).toBeFocused()
})

test('password confirmation and expired invitation remain on public page', async ({ page }) => {
  let requests = 0
  await page.route('**/api/invitations/accept/new-identity', (route) => {
    requests += 1
    return route.fulfill({ status: 400, json: { code: 'INVITATION_INVALID' } })
  })
  await page.goto(`/convites/aceitar#token=${token}`)
  await page.getByLabel('Crie sua senha').fill(password)
  await page.getByLabel('Confirme sua senha').fill(`${password} diferente`)
  await page.getByRole('button', { name: 'Criar conta e aceitar convite' }).click()
  await expect(page.getByRole('alert')).toContainText('As senhas precisam ser iguais')
  expect(requests).toBe(0)
  await page.getByLabel('Confirme sua senha').fill(password)
  await page.getByRole('button', { name: 'Criar conta e aceitar convite' }).click()
  await expect(page.getByRole('alert')).toContainText('Convite inválido, expirado')
  await expect(page).toHaveURL(/\/convites\/aceitar#token=/)
})
