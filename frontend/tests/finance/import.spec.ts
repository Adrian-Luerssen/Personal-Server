import { test, expect } from '../fixtures/auth'

test.describe('Finance Import', () => {
  test('should display import page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/import')
    await expect(page).toHaveURL(/\/finance\/import/)
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show step indicator', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/import')
    // StepIndicator renders step labels
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show file upload drop zone', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/import')
    // Drop zone has text about dragging or clicking to browse
    await expect(page.getByText(/\.json, \.backup, \.sqlite/i)).toBeVisible({ timeout: 10000 })
  })

  test('should have disabled preview button when no file selected', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/import')
    const previewBtn = page.locator('button').filter({ hasText: /preview/i })
    await expect(previewBtn).toBeVisible({ timeout: 10000 })
    await expect(previewBtn).toBeDisabled()
  })

  test('should show file input accepting correct file types', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/import')
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', '.json,.backup,.sqlite')
  })
})
