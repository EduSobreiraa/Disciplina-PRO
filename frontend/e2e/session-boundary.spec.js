import { expect, test } from '@playwright/test'

test('redirects an unauthenticated private route to the real login page', async ({ page }) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /disciplina pro/i })).toBeVisible()
  await expect(page.getByLabel(/e-mail/i)).toBeVisible()
  await expect(page.getByLabel(/senha/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /entrar/i })).toBeEnabled()
})
