import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

export const qualityRoutes = [
  ...['', '/programas', '/minha-evolucao', '/ritual', '/conquistas', '/missoes', '/protocolo', '/perfil'].map((suffix) => ({ path: `/app${suffix}`, role: 'user' })),
  ...['', '/hoje', '/registrar', '/meditar', '/novo-eu', '/jornada', '/progresso'].map((suffix) => ({ path: `/app/programas/projeto-66${suffix}`, role: 'user' })),
  { path: '/app/administracao', role: 'ceo' },
  { path: '/plataforma', role: 'platform' },
]

export async function auditPage(page, path, testInfo) {
  const errors = []
  page.on('pageerror', () => errors.push('Unhandled page error'))
  await page.addInitScript(() => {
    if (window.__pageQualityMetrics) return
    const metrics = { lcpMs: null, cls: 0, longTaskExcessMs: 0 }
    window.__pageQualityMetrics = metrics
    let sessionStart = 0
    let lastShift = 0
    let sessionValue = 0
    for (const type of ['largest-contentful-paint', 'layout-shift', 'longtask']) {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (type === 'largest-contentful-paint') metrics.lcpMs = entry.startTime
          if (type === 'longtask') metrics.longTaskExcessMs += Math.max(0, entry.duration - 50)
          if (type === 'layout-shift' && !entry.hadRecentInput) {
            if (entry.startTime - lastShift > 1000 || entry.startTime - sessionStart > 5000) {
              sessionStart = entry.startTime
              sessionValue = 0
            }
            lastShift = entry.startTime
            sessionValue += entry.value
            metrics.cls = Math.max(metrics.cls, sessionValue)
          }
        }
      }).observe({ type, buffered: true })
    }
  })
  await page.goto(path)
  await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}/?$`))
  await expect(page.locator('h1').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  const performance = await page.evaluate(() => ({
    ...window.__pageQualityMetrics,
    fcpMs: window.performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
    ttfbMs: window.performance.getEntriesByType('navigation')[0]?.responseStart ?? null,
  }))
  const results = await new AxeBuilder({ page }).analyze()
  const violations = results.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(({ target }) => target) }))
  const layouts = []
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    layouts.push(await page.evaluate(() => ({
      width: innerWidth, overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      smallTargets: [...document.querySelectorAll('a, button, input, select, textarea, summary')]
        .filter((element) => !element.disabled)
        .map((element) => element.matches('input[type="checkbox"], input[type="radio"]') ? element.labels?.[0] ?? element : element)
        .filter((element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return !element.disabled && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)
      }).map((element) => ({ tag: element.tagName, className: element.className, width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) })),
    })))
  }
  await testInfo.attach('page-quality', { body: JSON.stringify({ path, violations, layouts, errors, performance, throttling: 'none', inp: 'not measured' }), contentType: 'application/json' })
  expect.soft(violations, path).toEqual([])
  expect.soft(layouts.filter(({ overflow }) => overflow > 0), path).toEqual([])
  expect.soft(layouts.flatMap(({ width, smallTargets }) => smallTargets.map((target) => ({ viewport: width, ...target }))), path).toEqual([])
  expect(errors, path).toEqual([])
}
