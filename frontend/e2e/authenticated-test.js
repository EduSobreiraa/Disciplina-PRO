import { expect, test as base } from '@playwright/test'

export const browserE2eCredentials = {
  password: 'browser e2e password with enough entropy',
  user: 'browser-e2e@disciplina.test',
  manager: 'browser-manager-e2e@disciplina.test',
  ceo: 'browser-ceo-e2e@disciplina.test',
  platform: 'browser-platform-e2e@disciplina.test',
}

export const test = base.extend({
  e2eRole: ['user', { option: true }],
  page: async ({ page, e2eRole }, applyPage) => {
    const response = await page.request.post('http://localhost:3000/api/auth/login', {
      data: { email: browserE2eCredentials[e2eRole], password: browserE2eCredentials.password },
      headers: { Origin: 'http://localhost:5173' },
    })
    if (!response.ok()) throw new Error(`Login E2E de ${e2eRole} falhou: ${response.status()}`)
    await applyPage(page)
  },
})

export { expect }
