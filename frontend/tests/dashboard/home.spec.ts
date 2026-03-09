import { test, expect } from '../fixtures/auth'

test.describe('Dashboard', () => {
  test('should display dashboard after login', async ({ authenticatedPage: page }) => {
    await expect(page.locator('h1, h2, [class*="dashboard"], [class*="home"]').first()).toBeVisible()
  })

  test('should show stat cards', async ({ authenticatedPage: page }) => {
    await expect(page.locator('[class*="stat"], [class*="card"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('should have sidebar navigation', async ({ authenticatedPage: page }) => {
    await expect(page.locator('[class*="sidebar"], nav').first()).toBeVisible()
  })
})
