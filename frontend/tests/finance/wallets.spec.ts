import { test, expect } from '../fixtures/auth'

test.describe('Finance Wallets', () => {
  test('should display wallets page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/wallets')
    await expect(page).toHaveURL(/\/finance\/settings\?tab=wallets/)
    await expect(page.getByRole('heading', { name: /finance settings/i })).toBeVisible({ timeout: 10000 })
  })

  test('should preserve wallets as an explicit cash setup section', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/wallets')
    await expect(page.getByRole('button', { name: /wallets/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /categories/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /subscriptions/i })).toBeVisible()
  })

  test('should show wallet records or an actionable empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/wallets')
    await expect(page.getByRole('button', { name: /add wallet/i })).toBeVisible({ timeout: 10000 })
    const walletRecords = page.locator('.finance-wallet-card')
    const emptyState = page.getByText(/no wallets found/i)
    await expect.poll(async () => await walletRecords.count() > 0 || await emptyState.isVisible()).toBeTruthy()
  })
})
