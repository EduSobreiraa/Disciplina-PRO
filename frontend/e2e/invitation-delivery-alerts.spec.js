import { expect, test } from './authenticated-test.js'

test.use({ e2eRole: 'ceo' })

test('delivery reviews remain visible after reload without implying mailbox delivery', async ({ page }) => {
  await page.route('**/api/invitations', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    await route.fulfill({ json: [{ id: 'notice-test', email: 'convite@example.test', role: 'USER', status: 'PENDING', expiresAt: '2026-09-10T12:00:00Z', teams: [], deliveryReview: { reason: 'PERMANENT', noticeStatus: 'SENT' } }] })
  })
  await page.goto('/app/administracao')
  const alerts = page.getByRole('region', { name: 'Entregas que precisam de revisão' })
  await expect(alerts).toContainText('Entrega precisa de revisão: convite@example.test')
  await expect(alerts).toContainText('Falha definitiva ou bloqueio')
  await expect(alerts).toContainText('recebimento ainda não confirmado')
  await page.reload()
  await expect(alerts).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.evaluate(() => document.fonts.ready)
    await expect(alerts).toBeVisible()
    const overflow = await page.evaluate(() => [...document.querySelectorAll('.admin-layout, .admin-panel, .admin-panel input, .admin-panel select, .admin-delivery')].map((element) => ({ element: element.className || element.tagName, right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width })).filter(({ right }) => right > window.innerWidth))
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: JSON.stringify(overflow) }).toBeLessThanOrEqual(viewport.width)
  }
})
