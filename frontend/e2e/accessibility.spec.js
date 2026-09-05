import AxeBuilder from '@axe-core/playwright'
import { expect, test as authenticatedTest } from './authenticated-test.js'
import { test as anonymousTest } from '@playwright/test'

const requiredViewports = [
  { name: '320×568', width: 320, height: 568 },
  { name: '375×812', width: 375, height: 812 },
  { name: '768×1024', width: 768, height: 1024 },
  { name: '1440×900', width: 1440, height: 900 },
]

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth))
  expect(overflow).toBe(0)
}

async function expectTouchTargets(page) {
  const undersized = await page.locator('a, button, input, select, textarea').evaluateAll((elements) => elements
    .filter((element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return !element.hasAttribute('disabled') && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)
    })
    .map((element) => ({ label: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName, width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) })))
  expect(undersized).toEqual([])
}

async function expectAccessible(page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

anonymousTest('keeps the public login accessible', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /disciplina pro/i })).toBeVisible()
  await expectAccessible(page)
  await expectTouchTargets(page)
})

authenticatedTest('keeps the authenticated catalog accessible', async ({ page }) => {
  await page.goto('/app/programas')
  await expect(page.getByRole('heading', { name: 'Projeto 66 — Ciclo fundador' })).toBeVisible()
  await expectAccessible(page)
  await expectTouchTargets(page)
})

authenticatedTest('keeps the Projeto 66 navigation accessible', async ({ page }) => {
  await page.goto('/app/programas/projeto-66')
  await expect(page.getByRole('navigation', { name: 'Navegação do Projeto 66' })).toBeVisible()
  await expectAccessible(page)
  await expectTouchTargets(page)
})

authenticatedTest('keeps empty tracker rankings accessible', async ({ page }) => {
  await page.route('**/api/tracker/me?*', (route) => route.fulfill({ json: { behaviors: [], marks: [] } }))
  await page.goto('/app/minha-evolucao')
  await expect(page.getByText('Marque alguns dias para formar o ranking.')).toHaveCount(2)
  await expect(page.locator('.tracker-insights ol > p')).toHaveCount(0)
  const results = await new AxeBuilder({ page }).include('.tracker-insights').analyze()
  expect(results.violations).toEqual([])
})

authenticatedTest('keeps ritual section labels accessible', async ({ page }) => {
  await page.goto('/app/ritual')
  await expect(page.getByText('Carregando ritual…')).toHaveCount(0)
  await expect(page.locator('.ritual-section.red > header > span')).toBeVisible()
  await expectAccessible(page)
})

for (const viewport of requiredViewports) {
  authenticatedTest(`avoids horizontal overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/app/programas/projeto-66')
    await expect(page.getByRole('navigation', { name: 'Navegação do Projeto 66' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectTouchTargets(page)
  })
}
