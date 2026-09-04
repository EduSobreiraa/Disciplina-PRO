import { expect, test } from './authenticated-test.js'

const E2E_TENANT_TIME_ZONE = 'America/Bahia'

function currentTenantDay() {
  return Number(new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: E2E_TENANT_TIME_ZONE }).format(new Date()))
}

async function observeLocalStorage(context) {
  await context.addInitScript(() => {
    window.__dpLocalStorageAccesses = []
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method]
      Storage.prototype[method] = function (...args) {
        if (this === window.localStorage) window.__dpLocalStorageAccesses.push({ method, key: args[0] ?? null })
        return original.apply(this, args)
      }
    }
  })
}

async function expectTrackerGreen(page, day, mutate) {
  await page.getByRole('link', { name: 'Minha evolução' }).click()
  const mark = page.getByRole('button', { name: new RegExp(`Meta batida, dia ${day}:`) })
  await expect(mark).toBeVisible()
  if (mutate && (await mark.getAttribute('aria-label')).includes(`dia ${day}: sem marcação.`)) await mark.click()
  await expect(mark).toHaveAttribute('aria-label', new RegExp(`dia ${day}: cumprido\\.`))
}

async function expectOpeningComplete(page, mutate) {
  const loadResponse = page.waitForResponse((response) => response.url().includes('/api/ritual/me?') && response.request().method() === 'GET')
  await page.getByRole('link', { name: 'Ritual do dia' }).click()
  expect((await loadResponse).status()).toBe(200)
  const opening = page.locator('article.ritual-section').filter({ has: page.getByRole('heading', { name: /Abertura do Dia de Guerra/ }) })
  await expect(opening).toBeVisible()
  const checks = opening.locator('.ritual-checklist button')
  await expect(checks).toHaveCount(4)
  for (let index = 0; index < 4; index += 1) {
    const check = checks.nth(index)
    if (mutate && await check.getAttribute('aria-pressed') === 'false') await check.click()
    await expect(check).toHaveAttribute('aria-pressed', 'true')
  }
}

test('reconstructs tracker and ritual in a separate browser context and projects missions without localStorage', async ({ browser, context, page }) => {
  await observeLocalStorage(context)
  await page.goto('/app')
  await expect(page).toHaveURL(/\/app$/)
  const day = currentTenantDay()

  await expectTrackerGreen(page, day, true)
  await expectOpeningComplete(page, true)

  const restoredContext = await browser.newContext({ viewport: page.viewportSize() })
  await observeLocalStorage(restoredContext)
  const restored = await restoredContext.newPage()
  try {
    const response = await restored.request.post('http://localhost:3000/api/auth/login', {
      data: { email: 'browser-e2e@disciplina.test', password: 'browser e2e password with enough entropy' },
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(response.ok()).toBe(true)
    await restored.goto('/app')
    await expect(restored).toHaveURL(/\/app$/)
    await expectTrackerGreen(restored, day, false)
    await expectOpeningComplete(restored, false)
    await restored.getByRole('link', { name: 'Missões' }).click()

    const greenHundred = restored.locator('article.mission-card').filter({ has: restored.getByRole('heading', { name: 'Centena Verde' }) })
    const ritualMachine = restored.locator('article.mission-card').filter({ has: restored.getByRole('heading', { name: 'Máquina de Rituais' }) })
    await expect(greenHundred.locator('.mission-progress strong')).toHaveText('1/100')
    await expect(ritualMachine.locator('.mission-progress strong')).toHaveText('1/5')

    expect(await page.evaluate(() => window.__dpLocalStorageAccesses)).toEqual([])
    expect(await restored.evaluate(() => window.__dpLocalStorageAccesses)).toEqual([])
  } finally {
    await restoredContext.close()
  }
})
