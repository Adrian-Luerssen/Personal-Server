import { defineConfig } from '@playwright/test'

const host = process.env.PLAYWRIGHT_HOST || '127.0.0.1'
const port = Number(process.env.PLAYWRIGHT_PORT || 5173)
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://${host}:${port}`

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: `npm run dev -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
  },
})
