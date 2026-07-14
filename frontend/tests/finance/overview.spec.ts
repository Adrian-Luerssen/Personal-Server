import { test, expect } from '../fixtures/auth'

test.describe('Cash entry route', () => {
  test('should open directly on the month ledger', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    await expect(page).toHaveURL(/\/finance\/transactions/)
    await expect(page.getByRole('heading', { name: 'Cash', exact: true })).toBeVisible()
  })

  test('should summarize the selected month before the ledger', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    await expect(page.locator('.record-summary')).toBeVisible()
    await expect(page.locator('.record-summary__item')).toHaveCount(4)
  })

  test('should expose month navigation and direct transaction capture', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    await expect(page.getByLabel('Previous month')).toBeVisible()
    await expect(page.getByLabel('Next month')).toBeVisible()
    await expect(page.getByRole('button', { name: /add transaction/i }).first()).toBeVisible()
  })

  test('should keep the ledger legible when there are no matching records', async ({ authenticatedPage: page }) => {
    await page.goto('/finance')
    await expect(page.getByRole('heading', { name: 'Transactions', exact: true })).toBeVisible()
    const rowsOrState = page.locator('.record-cash-row, .record-state')
    await expect(rowsOrState.first()).toBeVisible({ timeout: 10000 })
  })
})
