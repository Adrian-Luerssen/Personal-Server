import { test, expect } from '../fixtures/auth'

test.describe('Workout History', () => {
  test('should display history page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/history')
    await expect(page).toHaveURL(/\/workout\/history/)
    await expect(page.getByRole('heading', { name: /workout history/i })).toBeVisible({ timeout: 10000 })
  })

  test('should show the session totals as one summary strip', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/history')
    await expect(page.locator('.workout-history-summary')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.workout-history-summary__primary')).toHaveCount(2)
    await expect(page.locator('.workout-history-summary__secondary')).toHaveCount(3)
    await expect(page.locator('.workout-history-summary')).toContainText('Training time')
  })

  test('should show search and date filter inputs', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/history')
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="date"]')).toBeVisible()
  })

  test('should show session list or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/history')
    await page.waitForTimeout(2000)
    const hasSessions = await page.locator('.session-card').first().isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/No workouts found/i).isVisible().catch(() => false)
    expect(hasSessions || hasEmpty).toBeTruthy()
  })
})
