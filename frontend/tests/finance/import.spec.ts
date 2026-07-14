import { test, expect } from '../fixtures/auth'

test.describe('Finance Import', () => {
  test('should display import page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/import')
    await expect(page).toHaveURL(/\/finance\/import/)
    await expect(page.getByRole('heading', { name: 'Import', exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('should show step indicator', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/import')
    const progress = page.getByLabel('Import progress')
    await expect(progress.getByText('Select File', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(progress.getByText('Preview Import', { exact: true })).toBeVisible()
    await expect(progress.locator('[aria-current="step"]')).toContainText('Select File')
  })

  test('should show file upload drop zone', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/import')
    await expect(page.getByText(/drop your cashew backup file here/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/\.backup, \.sqlite, \.sqlite3, or \.db/i)).toBeVisible()
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
    await expect(fileInput).toHaveAttribute('accept', /\.backup.*\.sqlite.*\.db/)
  })
})
