import { test } from './authenticated-test.js'
import { auditPage, qualityRoutes } from '../e2e-support/page-quality.js'

for (const { path, role } of qualityRoutes) {
  test.describe(path, () => {
    test.use({ e2eRole: role })
    test('accessible and responsive authenticated page', async ({ page }, testInfo) => {
      await auditPage(page, path, testInfo)
    })
  })
}
