import { test, expect } from '../fixtures/auth'

test.describe('Connections Settings', () => {
  test('should navigate to connections tab', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.click('text=/connection/i')
    await expect(page.locator('[class*="connection"], [class*="integration"], [class*="service"]').first()).toBeVisible()
  })

  test('should show connection elements', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.click('text=/connection/i')
    await expect(page.locator('[class*="connection"], [class*="integration"], [class*="linked"]').first()).toBeVisible()
  })

  test('should show connect or disconnect buttons', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.click('text=/connection/i')
    await expect(page.getByRole('button', { name: /connect|disconnect|link|unlink/i }).first()).toBeVisible()
  })
})
