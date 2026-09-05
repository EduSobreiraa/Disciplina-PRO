import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config.js'

export default defineConfig(base, {
  testMatch: ['session-boundary.spec.js', 'authenticated-catalog.spec.js', 'accessibility.spec.js'],
  outputDir: 'test-results/compatibility',
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
})
