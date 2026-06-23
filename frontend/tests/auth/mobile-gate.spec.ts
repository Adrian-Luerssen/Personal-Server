import { test, expect } from '@playwright/test'

test.describe('Mobile browser gate', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
  })

  test('shows the APK download path instead of the login form on mobile browser', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('link', { name: /download android app/i }).first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toHaveCount(0)
  })

  test('shows the APK download path when a mobile browser requests a platform route', async ({ page }) => {
    await page.goto('/home')

    await expect(page.getByRole('link', { name: /download android app/i }).first()).toBeVisible()
    await expect(page).not.toHaveURL(/\/home$/)
  })
})
