import { test, expect } from '../fixtures/auth'

test.describe('Workout Import', () => {
  test('should display import page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/import')
    await expect(page).toHaveURL(/\/workout\/import/)
    await expect(page.locator('h2').filter({ hasText: /Import FitNotes Data/i })).toBeVisible({ timeout: 10000 })
  })

  test('should show step indicator starting at step 1', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/import')
    // StepIndicator component renders the STEPS array: File, Preview, Options, Import, Done
    const progress = page.getByLabel('Import progress')
    await expect(progress.getByText('File', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(progress.locator('[aria-current="step"]')).toContainText('File')
  })

  test('should show file upload drop zone', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/import')
    await expect(page.getByText(/Drag & drop your .db file here/i)).toBeVisible({ timeout: 10000 })
  })

  test('should show file type instructions', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/import')
    await expect(page.getByText(/\.fitnotes, \.db, \.sqlite, or \.sqlite3/i)).toBeVisible({ timeout: 10000 })
  })

  test('should have disabled preview button when no file selected', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/import')
    const previewBtn = page.locator('button').filter({ hasText: /Preview Import/i })
    await expect(previewBtn).toBeVisible({ timeout: 10000 })
    await expect(previewBtn).toBeDisabled()
  })

  test('should show how-to export instructions in details element', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/import')
    const details = page.locator('details summary').filter({ hasText: /How to export from FitNotes/i })
    await expect(details).toBeVisible({ timeout: 10000 })
  })
})
