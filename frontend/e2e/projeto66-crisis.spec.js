import { expect, test } from './authenticated-test.js'

async function openProjeto66(page) {
  await page.goto('/app/programas')
  await page.getByRole('link', { name: /Entrar no programa/ }).click()
  await expect(page.getByRole('navigation', { name: 'Navegação do Projeto 66' })).toBeVisible()
  const start = page.getByRole('button', { name: 'Iniciar meu ciclo de 66 dias' })
  if (await start.isVisible()) await start.click()
  await expect(page.getByRole('link', { name: 'Registrar o dia' })).toBeVisible()
}

test('Projeto 66 loads authenticated context, navigation and crisis dialog keyboard behavior', async ({ page }) => {
  await openProjeto66(page)
  await page.getByRole('link', { name: 'Checklist' }).click()
  await expect(page.getByRole('heading', { name: 'Checklist' })).toBeVisible()
  await page.getByRole('link', { name: 'Meditar' }).click()
  await expect(page.getByRole('heading', { name: 'Meditar' })).toBeVisible()

  const opener = page.getByRole('button', { name: 'Abrir modo crise' })
  await opener.focus()
  await opener.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Pare. Respire. Escolha.' })
  const breathe = dialog.getByRole('button', { name: /Inspirar e soltar/ })
  const overcame = dialog.getByRole('button', { name: 'Venci o impulso' })
  const leave = dialog.getByRole('button', { name: 'Sair por agora' })
  await expect(dialog).toBeVisible()
  await expect(breathe).toBeFocused()
  await breathe.press('Enter')
  await expect(breathe).toContainText('1 respirações conscientes')

  await page.keyboard.press('Shift+Tab')
  await expect(leave).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(breathe).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(overcame).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(leave).toBeFocused()
  await expect(page.getByRole('link', { name: /Disciplina PRO/ })).not.toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test('Projeto 66 remains usable without horizontal overflow in audited viewports', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await openProjeto66(page)
    await expect(page.getByRole('navigation', { name: 'Navegação do Projeto 66' })).toBeVisible()
    expect(await page.evaluate(() => window.innerWidth)).toBe(viewport.width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    const opener = page.getByRole('button', { name: 'Abrir modo crise' })
    await expect(opener).toBeVisible()
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Pare. Respire. Escolha.' })
    await expect(dialog).toBeVisible()
    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
    await page.keyboard.press('Escape')
  }
})

test('Projeto 66 exposes loading while a real enrollment read is pending', async ({ page }) => {
  let releaseEnrollmentRead
  const enrollmentRead = new Promise((resolve) => { releaseEnrollmentRead = resolve })
  let pendingEnrollmentReads = 0
  const holdEnrollmentRead = async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/enrollments') return route.continue()
    pendingEnrollmentReads += 1
    await enrollmentRead
    return route.continue()
  }
  await page.route('**/*', holdEnrollmentRead)
  const navigation = page.goto('/app/programas/projeto-66')
  await expect(page.getByText('Carregando seu ciclo…')).toBeVisible()
  expect(pendingEnrollmentReads).toBeGreaterThan(0)
  releaseEnrollmentRead()
  await navigation
  await page.unroute('**/*', holdEnrollmentRead)
  await expect(page.getByRole('navigation', { name: 'Navegação do Projeto 66' })).toBeVisible()
})

test('Projeto 66 shows an initial read error and retries against the real API', async ({ page }) => {
  let failedEnrollmentRead = 0
  const failInitialEnrollmentRead = (route) => {
    if (new URL(route.request().url()).pathname === '/api/enrollments') {
      failedEnrollmentRead += 1
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Indisponibilidade E2E controlada' }),
      })
    }
    return route.continue()
  }
  await page.route('**/*', failInitialEnrollmentRead)
  await page.goto('/app/programas/projeto-66')
  await expect(page.getByText('Indisponibilidade E2E controlada')).toBeVisible()
  expect(failedEnrollmentRead).toBeGreaterThan(0)
  await page.unroute('**/*', failInitialEnrollmentRead)
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('navigation', { name: 'Navegação do Projeto 66' })).toBeVisible()
})
