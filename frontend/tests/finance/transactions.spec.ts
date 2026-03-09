import { test, expect } from '../fixtures/auth'

test.describe('Finance Transactions', () => {
  test('should display transactions page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/transactions')
    await expect(page).toHaveURL(/\/finance\/transactions/)
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show filter controls', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/transactions')
    // Filter card with search, type, wallet, category, date filters
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('should show transactions table or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/transactions')
    await page.waitForTimeout(2000)
    const hasTable = await page.locator('table').isVisible().catch(() => false)
    const hasEmpty = await page.locator('.card').filter({ hasText: /no transactions/i }).isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBeTruthy()
  })

  test('should have date range filter inputs', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/transactions')
    const dateInputs = page.locator('input[type="date"]')
    await expect(dateInputs.first()).toBeVisible({ timeout: 10000 })
  })

  test('should have clear filters button', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/transactions')
    await expect(page.locator('button').filter({ hasText: /clear/i })).toBeVisible({ timeout: 10000 })
  })
})
