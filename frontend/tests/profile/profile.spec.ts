import { test, expect } from '../fixtures/auth'

test.describe('Profile', () => {
  test('should display profile page', async ({ authenticatedPage: page }) => {
    await page.goto('/profile')
    await expect(page.locator('input[type="email"], [class*="profile"]').first()).toBeVisible()
  })
})
