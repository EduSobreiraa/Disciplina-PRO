import { expect, test } from './authenticated-test.js'

test('only today is editable and one green mark does not complete the month', async ({ page }) => {
  // UTC is already tomorrow; the organization in Bahia is still on September 5.
  await page.clock.install({ time: new Date('2026-09-06T01:00:00Z') })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/tracker/me?*', (route) => route.fulfill({ json: {
    behaviors: [{ id: 'calendar-test', name: 'Teste calendário', active: true, position: 0 }],
    marks: [{ behaviorId: 'calendar-test', trackedOn: '2026-09-05T00:00:00Z', status: 'COMPLETED', justification: null }],
  } }))
  await page.goto('/app')
  await page.getByRole('link', { name: 'Minha evolução' }).click()
  const day = (number) => page.getByRole('button', { name: new RegExp(`Teste calendário, dia ${number}:`) })
  await expect(day(4)).toBeDisabled()
  await expect(day(5)).toBeEnabled()
  await expect(day(6)).toBeDisabled()
  await expect(page.locator('.tracker-kpis article').first()).toContainText('3%')
  await page.clock.fastForward(2 * 60 * 60 * 1000)
  await expect(day(5)).toBeDisabled()
  await expect(day(6)).toBeEnabled()
  await page.getByRole('button', { name: 'Ago', exact: true }).click()
  await expect(page.locator('.mark:enabled')).toHaveCount(0)
})

test('monthly score stays below 100 until every behavior is completed on every day', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-30T15:00:00Z') })
  const behaviors = Array.from({ length: 20 }, (_, index) => ({ id: `month-${index}`, name: `Hábito ${index + 1}`, active: true, position: index }))
  const marks = behaviors.flatMap(({ id }) => Array.from({ length: 30 }, (_, index) => ({
    behaviorId: id, trackedOn: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00Z`, status: 'COMPLETED', justification: null,
  })))
  let complete = false
  await page.route('**/api/tracker/me?*', (route) => route.fulfill({ json: { behaviors, marks: complete ? marks : marks.slice(0, -1) } }))
  await page.goto('/app/minha-evolucao')
  await expect(page.locator('.tracker-kpis article').first()).toContainText('99%')
  complete = true
  await page.reload()
  await expect(page.locator('.tracker-kpis article').first()).toContainText('100%')
  await expect(page.locator('.tracker-kpis article').nth(2)).toContainText('30')
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})
