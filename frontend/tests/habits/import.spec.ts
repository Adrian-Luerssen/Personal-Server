import { test, expect } from '../fixtures/auth'

test.describe('Habits Import', () => {
  test('should display import page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/habits/import')
    await expect(page).toHaveURL(/\/habits\/import/)
    await expect(page.locator('h2').filter({ hasText: /Import HabitShare Data/i })).toBeVisible({ timeout: 10000 })
  })

  test('should show step indicator with wizard steps', async ({ authenticatedPage: page }) => {
    await page.goto('/habits/import')
    // STEPS = ['File', 'Preview', 'Import', 'Done']
    await expect(page.getByText('File')).toBeVisible({ timeout: 10000 })
  })

  test('should show file upload drop zone for CSV', async ({ authenticatedPage: page }) => {
    await page.goto('/habits/import')
    await expect(page.getByText(/Drag & drop your HabitShare CSV here/i)).toBeVisible({ timeout: 10000 })
  })

  test('should show accepted file types hint', async ({ authenticatedPage: page }) => {
    await page.goto('/habits/import')
    await expect(page.getByText(/\.csv files/i)).toBeVisible({ timeout: 10000 })
  })

  test('should have disabled preview button when no file selected', async ({ authenticatedPage: page }) => {
    await page.goto('/habits/import')
    const previewBtn = page.locator('button').filter({ hasText: /Preview Import/i })
    await expect(previewBtn).toBeVisible({ timeout: 10000 })
    await expect(previewBtn).toBeDisabled()
  })

  test('should show how-to export instructions', async ({ authenticatedPage: page }) => {
    await page.goto('/habits/import')
    const details = page.locator('details summary').filter({ hasText: /How to export from HabitShare/i })
    await expect(details).toBeVisible({ timeout: 10000 })
  })

  test('should accept only CSV files in file input', async ({ authenticatedPage: page }) => {
    await page.goto('/habits/import')
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', '.csv')
  })
})
