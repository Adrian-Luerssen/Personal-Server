import { test, expect } from '../fixtures/auth'

test.describe('Chat Panel', () => {
  test('should show chat toggle button', async ({ authenticatedPage: page }) => {
    await expect(page.locator('[class*="chat-toggle"], [class*="chatToggle"]').first()).toBeVisible()
  })

  test('should open chat panel on click', async ({ authenticatedPage: page }) => {
    await page.locator('[class*="chat-toggle"], [class*="chatToggle"]').first().click()
    await expect(page.locator('[class*="chat-panel"], [class*="chatPanel"]').first()).toBeVisible()
  })

  test('should show new conversation button', async ({ authenticatedPage: page }) => {
    await page.locator('[class*="chat-toggle"], [class*="chatToggle"]').first().click()
    await expect(page.getByRole('button', { name: /new/i })).toBeVisible()
  })
})
