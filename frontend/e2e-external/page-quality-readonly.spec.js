import { test, expect } from '@playwright/test'
import process from 'node:process'
import { auditPage, qualityRoutes } from '../e2e-support/page-quality.js'

const origin = new URL(process.env.E2E_EXTERNAL_BASE_URL).origin
const allowed = new Set(['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'])
const emails = { user: 'lab-user@disciplina.test', ceo: 'lab-ceo@disciplina.test', platform: 'lab-superadmin@disciplina.test' }

for (const role of ['user', 'ceo', 'platform']) {
  test(`read-only quality ${role}`, async ({ page }, testInfo) => {
    test.setTimeout(180_000)
    const mutations = []
    await page.route('**/api/**', (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin === origin && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !allowed.has(url.pathname)) {
        mutations.push(`${request.method()} ${url.pathname}`)
        return route.abort()
      }
      return route.continue()
    })
    const login = await page.request.post('/api/auth/login', {
      headers: { Origin: origin }, data: { email: emails[role], password: process.env.E2E_EXTERNAL_PASSWORD },
    })
    expect(login.status(), `Login de teste ${role}`).toBe(200)
    try {
      for (const { path } of qualityRoutes.filter((route) => route.role === role)) {
        await auditPage(page, path, testInfo)
      }
    } finally {
      const cookie = (await page.context().cookies(origin)).find(({ name }) => name === '__Host-dp_csrf')
      if (cookie) await page.request.post('/api/auth/logout', { headers: { Origin: origin, 'X-CSRF-Token': decodeURIComponent(cookie.value) } })
    }
    expect(mutations).toEqual([])
  })
}
