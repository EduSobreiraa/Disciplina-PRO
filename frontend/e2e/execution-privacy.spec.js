import { expect, test } from '@playwright/test'

const EMAIL = 'browser-e2e@disciplina.test'
const PASSWORD = 'browser e2e password with enough entropy'
const SECRET = 'conteudo-privado-e2e-nao-propagar-8842'

test('keeps a private reflection outside objective execution, audit, reporting and gamification', async ({ page, isMobile }) => {
  test.skip(isMobile, 'A jornada funcional é exercitada uma vez; viewports completos fecham na B8.4.3')
  const mutationBodies = []
  page.on('request', (request) => {
    if (['PUT', 'POST'].includes(request.method())) mutationBodies.push({ url: request.url(), body: request.postData() ?? '' })
  })

  await page.goto('/login')
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/app$/)
  await page.getByRole('link', { name: 'Programas' }).click()
  const cycleResponse = page.waitForResponse((response) => /\/api\/enrollments\/[0-9a-f-]+$/.test(response.url()) && response.request().method() === 'GET')
  await page.getByRole('link', { name: /Entrar no programa/ }).click()
  expect((await cycleResponse).status()).toBe(200)
  const start = page.getByRole('button', { name: 'Iniciar meu ciclo de 66 dias' })
  const recordLink = page.getByRole('link', { name: 'Registrar o dia' })
  await expect(start.or(recordLink)).toBeVisible()
  if (await start.isVisible()) {
    const startResponse = page.waitForResponse((response) => response.url().includes('/enrollments/') && response.url().endsWith('/start') && response.request().method() === 'POST')
    await start.click()
    expect((await startResponse).status()).toBe(201)
    await expect(recordLink).toBeVisible()
  }
  await page.getByRole('link', { name: '+ Registrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Registrar o dia' })).toBeVisible()

  const resultMission = page.getByRole('button', { name: /Resultado/ })
  if (await resultMission.isEnabled()) await resultMission.click()
  const courage = page.getByRole('button', { name: /Coragem/ })
  await expect(courage).toBeEnabled()
  await courage.click()
  const gratitude = page.locator('textarea')
  await gratitude.nth(0).fill(SECRET)
  await gratitude.nth(1).fill('futuro controlado pelo teste')
  await gratitude.nth(2).fill('pessoa de confiança')

  const privateWrite = page.waitForResponse((response) => response.url().includes('/private-responses/') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: /Concluir registro do dia|Salvar missões e conteúdo privado/ }).click()
  expect((await privateWrite).status()).toBe(200)
  await expect(page.getByRole('status')).toContainText('salvo')

  const privateMutations = mutationBodies.filter(({ url }) => url.includes('/private-responses/'))
  const objectiveMutations = mutationBodies.filter(({ url }) => url.includes('/daily-record') || url.includes('/completion'))
  expect(privateMutations.some(({ body }) => body.includes(SECRET))).toBe(true)
  expect(objectiveMutations.every(({ body }) => !body.includes(SECRET))).toBe(true)

  const apiLogin = await page.request.post('/api/auth/login', { data: { email: EMAIL, password: PASSWORD }, headers: { Origin: 'http://localhost:5173' } })
  expect(apiLogin.status()).toBe(200)
  const { accessToken } = await apiLogin.json()
  const session = await page.request.get('/api/session', { headers: { Authorization: `Bearer ${accessToken}`, Origin: 'http://localhost:5173' } })
  const tenantId = (await session.json()).organizations[0].tenant.id
  const headers = { Authorization: `Bearer ${accessToken}`, Origin: 'http://localhost:5173', 'X-Tenant-Id': tenantId }
  const enrollments = await page.request.get('/api/enrollments', { headers })
  const enrollment = (await enrollments.json()).find(({ program }) => program.slug === 'projeto-66')
  const detail = await page.request.get(`/api/enrollments/${enrollment.id}`, { headers })
  const detailBody = await detail.json()
  expect(detailBody.dailyRecords.length).toBeGreaterThan(0)
  expect(detailBody.activityCompletions.length).toBeGreaterThan(0)
  const privateActivity = detailBody.activities.find(({ key }) => key === 'daily-reflection')
  const privateRead = await page.request.get(`/api/enrollments/${enrollment.id}/private-responses/${privateActivity.id}`, { headers })
  expect(JSON.stringify(await privateRead.json())).toContain(SECRET)

  for (const path of ['/api/reports/me', '/api/audit/me?page=1&limit=100', '/api/gamification/me', '/api/missions/me']) {
    const response = await page.request.get(path, { headers })
    expect(response.status(), path).toBe(200)
    expect(JSON.stringify(await response.json())).not.toContain(SECRET)
  }
  expect(JSON.stringify(detailBody)).not.toContain(SECRET)
})
