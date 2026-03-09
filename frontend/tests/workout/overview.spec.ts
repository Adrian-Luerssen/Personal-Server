import { test, expect } from '../fixtures/auth'

test.describe('Workout Overview', () => {
  test('should display workout overview page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    await expect(page.locator('h2').filter({ hasText: /Workout Tracker/i })).toBeVisible({ timeout: 10000 })
  })

  test('should show stat cards grid', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    await expect(page.locator('.stat-grid').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show quick action cards for navigation', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    // Quick Actions section has interactive cards for Start Workout, View History, etc.
    const quickActions = page.locator('.card.interactive')
    await expect(quickActions.first()).toBeVisible({ timeout: 10000 })
    // Verify at least the core navigation actions exist
    await expect(page.getByText('View History')).toBeVisible()
    await expect(page.getByText('Manage Exercises')).toBeVisible()
    await expect(page.getByText('Bodyweight')).toBeVisible()
    await expect(page.getByText('Import Data')).toBeVisible()
  })

  test('should show recent workouts section or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    // Wait for loading to finish
    await page.waitForTimeout(2000)
    const hasRecent = await page.getByText('Recent Workouts').isVisible().catch(() => false)
    const hasEmpty = await page.locator('.empty-state').isVisible().catch(() => false)
    expect(hasRecent || hasEmpty).toBeTruthy()
  })

  test('should navigate to history page via quick action', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    await page.getByText('View History').click()
    await expect(page).toHaveURL(/\/workout\/history/)
  })

  test('should navigate to exercises page via quick action', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    await page.getByText('Manage Exercises').click()
    await expect(page).toHaveURL(/\/workout\/exercises/)
  })
})
