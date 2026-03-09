import { test as base, expect, Page } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123'
const API_BASE = process.env.API_BASE || 'http://localhost:4051/api'

type AuthFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Attempt login via the API to get tokens
    const res = await page.request.post(`${API_BASE}/auth/access`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    })

    if (res.ok()) {
      const data = await res.json()
      // Inject tokens into localStorage before navigating
      await page.goto('/')
      await page.evaluate(
        ({ accessToken, refreshToken }) => {
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
        },
        { accessToken: data.accessToken, refreshToken: data.refreshToken }
      )
    } else {
      // Fallback: try logging in via the UI
      await page.goto('/login')
      await page.locator('input').first().fill(TEST_EMAIL)
      await page.locator('input[type="password"]').fill(TEST_PASSWORD)
      await page.locator('button[type="submit"]').click()
      await page.waitForURL(/\/home/, { timeout: 10000 })
    }

    await use(page)
  },
})

export { expect }
