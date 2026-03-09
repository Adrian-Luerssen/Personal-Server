import { test as base, expect } from '@playwright/test'

export const test = base.extend<{ authenticatedPage: any }>({
  authenticatedPage: async ({ page }, use) => {
    // Login helper - navigate to login and authenticate
    await page.goto('/login')
    await page.fill('input[type="email"]', 'root@gmail.com')
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'testpassword')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(home|dashboard)/)
    await use(page)
  },
})

export { expect }
