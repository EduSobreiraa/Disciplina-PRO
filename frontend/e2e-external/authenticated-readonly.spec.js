import { expect, test as base } from '@playwright/test'
import process from 'node:process'

const participant = {
  email: process.env.E2E_EXTERNAL_PARTICIPANT_EMAIL ?? 'lab-user@disciplina.test',
  password: process.env.E2E_EXTERNAL_PARTICIPANT_PASSWORD ?? process.env.E2E_EXTERNAL_PASSWORD,
}
const administrator = {
  email: process.env.E2E_EXTERNAL_ADMIN_EMAIL ?? 'lab-ceo@disciplina.test',
  password: process.env.E2E_EXTERNAL_ADMIN_PASSWORD ?? process.env.E2E_EXTERNAL_PASSWORD,
}
const externalOrigin = new URL(process.env.E2E_EXTERNAL_BASE_URL).origin

if (!participant.password || !administrator.password) {
  throw new Error('Defina E2E_EXTERNAL_PASSWORD ou as senhas separadas para executar o smoke autenticado.')
}

const allowedMutationPaths = new Set(['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'])

function observeBusinessMutations(page) {
  const mutations = []
  page.on('request', (request) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return
    const url = new URL(request.url())
    if (url.origin === externalOrigin && !allowedMutationPaths.has(url.pathname)) {
      mutations.push(`${request.method()} ${url.pathname}`)
    }
  })
  return mutations
}

async function apiLogin(page, credentials) {
  const response = await page.request.post('/api/auth/login', {
    data: credentials,
    headers: { Origin: externalOrigin },
  })
  expect(response.ok(), `Login de ${credentials.email} falhou com HTTP ${response.status()}.`).toBe(true)
}

async function logout(page) {
  const button = page.getByRole('button', { name: 'Sair', exact: true })
  if (await button.isVisible().catch(() => false)) {
    await button.click()
    await expect(page).toHaveURL(/\/login\/?$/)
  }
}

const test = base.extend({
  page: async ({ page }, applyPage) => {
    const businessMutations = observeBusinessMutations(page)
    try {
      await applyPage(page)
    } finally {
      await logout(page)
      expect(businessMutations, 'O smoke autenticado não pode alterar dados de negócio.').toEqual([])
    }
  },
})

test('logs in, restores the session and logs out through the deployed UI', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/e-mail/i).fill(participant.email)
  await page.getByLabel(/senha/i).fill(participant.password)

  const loginResponse = page.waitForResponse((response) => response.url().endsWith('/api/auth/login'))
  await page.getByRole('button', { name: /entrar/i }).click()
  expect((await loginResponse).ok()).toBe(true)
  await expect(page).toHaveURL(/\/app\/?$/)
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
  await expect(page.getByText(participant.email, { exact: true })).toBeVisible()

  const refreshResponse = page.waitForResponse((response) => response.url().endsWith('/api/auth/refresh'))
  await page.reload()
  expect((await refreshResponse).ok()).toBe(true)
  await expect(page.getByText(participant.email, { exact: true })).toBeVisible()

  await logout(page)
  await expect(page.getByLabel(/e-mail/i)).toBeVisible()
})

test('reads tenant, Projeto 66, tracker and ritual projections', async ({ page }) => {
  await apiLogin(page, participant)

  await page.goto('/app')
  await expect(page.getByText(participant.email, { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Bom dia/i })).toBeVisible()

  await page.goto('/app/programas/projeto-66')
  await expect(page.getByText('Carregando seu ciclo…')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Navegação do Projeto 66' })).toBeVisible()

  await page.goto('/app/minha-evolucao')
  await expect(page.getByRole('heading', { name: /Minha evolução/i })).toBeVisible()
  await expect(page.getByText('Carregando tracker…')).toHaveCount(0)
  await expect(page.getByText('Não foi possível sincronizar o tracker.')).toHaveCount(0)

  await page.goto('/app/ritual')
  await expect(page.getByRole('heading', { name: /Ritual do dia/i })).toBeVisible()
  await expect(page.getByText('Carregando ritual…')).toHaveCount(0)
  await expect(page.getByText('Não foi possível sincronizar o ritual.')).toHaveCount(0)
})

test('reads tenant administration and invitation projections without submitting forms', async ({ page }) => {
  await apiLogin(page, administrator)

  await page.goto('/app/administracao')
  await expect(page).toHaveURL(/\/app\/administracao\/?$/)
  await expect(page.getByRole('heading', { name: /Pessoas e times/i })).toBeVisible()
  await expect(page.getByText('Carregando estrutura da organização…')).toHaveCount(0)
  await expect(page.getByText('Não foi possível carregar a administração.')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Convites' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar convite' })).toBeVisible()
})
