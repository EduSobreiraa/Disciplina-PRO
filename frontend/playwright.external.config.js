import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

const configuredBaseUrl = process.env.E2E_EXTERNAL_BASE_URL

if (!configuredBaseUrl) {
  throw new Error('E2E_EXTERNAL_BASE_URL e obrigatoria para os smoke tests externos.')
}

const baseUrl = new URL(configuredBaseUrl)

if (baseUrl.protocol !== 'https:') {
  throw new Error('E2E_EXTERNAL_BASE_URL deve usar HTTPS.')
}

if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
  throw new Error('E2E_EXTERNAL_BASE_URL deve conter somente origem e caminho base.')
}

export default defineConfig({
  testDir: './e2e-external',
  outputDir: 'test-results/external',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report/external' }]] : 'line',
  use: {
    baseURL: baseUrl.href,
    timezoneId: 'America/Bahia',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'external-desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'external-mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
})
