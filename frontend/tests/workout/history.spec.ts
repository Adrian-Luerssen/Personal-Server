import { test, expect } from '../fixtures/auth'

test.describe('Workout History', () => {
  test('should display history page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/history')
    await expect(page).toHaveURL(/\/workout\/history/)
    await expect(page.locator('h2').filter({ hasText: /Workout History/i })).toBeVisible({ timeout: 10000 })
  })

  test('should show stat cards for workout totals', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/history')
    await expect(page.locator('.stat-grid').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show search and date filter inputs', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/history')
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="date"]')).toBeVisible()
  })

  test('should show session list or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/history')
    await page.waitForTimeout(2000)
    const hasSessions = await page.locator('.card').nth(2).isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/No workouts found/i).isVisible().catch(() => false)
    expect(hasSessions || hasEmpty).toBeTruthy()
  })
})
