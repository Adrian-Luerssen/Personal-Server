import { test, expect } from '../fixtures/auth'

test.describe('Finance Wallets', () => {
  test('should display wallets page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/wallets')
    await expect(page).toHaveURL(/\/finance\/wallets/)
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show total balance card', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/wallets')
    // Total balance card has gradient background and large balance text
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show wallet cards grid or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/wallets')
    await page.waitForTimeout(2000)
    const hasWallets = await page.locator('.card').nth(1).isVisible().catch(() => false)
    const hasEmpty = await page.locator('.card').filter({ hasText: /no wallets/i }).isVisible().catch(() => false)
    expect(hasWallets || hasEmpty).toBeTruthy()
  })
})
