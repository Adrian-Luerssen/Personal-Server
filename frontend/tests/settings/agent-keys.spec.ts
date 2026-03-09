import { test, expect } from '../fixtures/auth'

test.describe('Agent Keys Settings', () => {
  test('should navigate to agent keys tab', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.click('text=/agent.*key/i')
    await expect(page.locator('[class*="agent"], [class*="key"], [class*="api"]').first()).toBeVisible()
  })

  test('should show key elements', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.click('text=/agent.*key/i')
    await expect(page.locator('[class*="key"], [class*="token"], [class*="api"]').first()).toBeVisible()
  })

  test('should show create button', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.click('text=/agent.*key/i')
    await expect(page.getByRole('button', { name: /create|add|new|generate/i })).toBeVisible()
  })
})
