import { test, expect } from '../fixtures/auth'

test.describe('Appearance Settings', () => {
  test('should display appearance tab', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.click('text=/appearance/i')
    await expect(page.locator('[class*="appearance"], [class*="color"], [class*="theme"]').first()).toBeVisible()
  })

  test('should show color swatches', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.click('text=/appearance/i')
    await expect(page.locator('[class*="swatch"], [class*="color"]').first()).toBeVisible()
  })
})
