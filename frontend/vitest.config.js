import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.component.test.jsx'],
    setupFiles: ['./src/test/component-setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary'],
      reportsDirectory: './coverage/components',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.js', 'src/**/*.component.test.jsx', 'src/test/**'],
    },
  },
})
