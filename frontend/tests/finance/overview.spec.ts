import { test, expect } from '../fixtures/auth'

test.describe('Finance Overview', () => {
  test('should display finance overview page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show stat cards grid with balance info', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    await expect(page.locator('.stat-grid').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show quick action cards for navigation', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    const quickActions = page.locator('.card.interactive')
    await expect(quickActions.first()).toBeVisible({ timeout: 10000 })
  })

  test('should show spending by category chart or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    await page.waitForTimeout(2000)
    // Either a pie chart canvas or an empty state message
    const hasChart = await page.locator('canvas').isVisible().catch(() => false)
    const hasEmpty = await page.locator('.empty-state').first().isVisible().catch(() => false)
    expect(hasChart || hasEmpty).toBeTruthy()
  })

  test('should show wallets overview section', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    await page.waitForTimeout(2000)
    // Wallets section with wallet cards or empty state
    const hasWallets = await page.locator('.card').nth(2).isVisible().catch(() => false)
    const hasEmpty = await page.locator('.empty-state').first().isVisible().catch(() => false)
    expect(hasWallets || hasEmpty).toBeTruthy()
  })

  test('should show recent transactions section', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    await page.waitForTimeout(2000)
    const hasTable = await page.locator('table').isVisible().catch(() => false)
    const hasEmpty = await page.locator('.empty-state').first().isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBeTruthy()
  })

  test('should navigate to transactions page', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    const txButton = page.locator('.card.interactive').first()
    await txButton.click()
    await expect(page).toHaveURL(/\/finance\/transactions/)
  })
})
