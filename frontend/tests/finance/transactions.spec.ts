import { test, expect } from '../fixtures/auth'

test.describe('Finance Transactions', () => {
  test('should display transactions page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/transactions')
    await expect(page).toHaveURL(/\/finance\/transactions/)
    await expect(page.getByRole('heading', { name: 'Cash', exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('should show filter controls', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/transactions')
    await expect(page.getByRole('searchbox', { name: /search transactions/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('group', { name: /transaction type filter/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /show filters/i })).toBeVisible()
  })

  test('should show transactions table or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/transactions')
    await page.waitForTimeout(2000)
    await expect(page.getByRole('heading', { name: 'Transactions', exact: true })).toBeVisible()
    await expect(page.locator('.record-cash-row, .record-state').first()).toBeVisible()
  })

  test('should reveal wallet and category filters only when requested', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/transactions')
    const moreFilters = page.locator('.record-cash-filters__toggle')
    await expect(moreFilters).toHaveAttribute('aria-expanded', 'false')
    await moreFilters.click()
    await expect(moreFilters).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByLabel(/wallet filter/i)).toBeVisible()
    await expect(page.getByLabel(/category filter/i)).toBeVisible()
  })

  test('should support reversible quick filters', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/transactions')
    const expenses = page.getByRole('group', { name: /transaction type filter/i }).getByRole('button', { name: 'Expense', exact: true })
    await expenses.click()
    await expect(expenses).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: /clear all/i })).toBeVisible()
  })
})
