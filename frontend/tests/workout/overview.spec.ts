import { test, expect } from '../fixtures/auth'

test.describe('Workout Overview', () => {
  test('should display workout overview page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    await expect(page.getByRole('heading', { name: 'Training', exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('should show a compact training summary', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    await expect(page.locator('.record-summary')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.record-summary__item')).toHaveCount(4)
  })

  test('should expose the primary session action and training records', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    await expect(page.getByTestId('gym-primary-action')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: /recent sessions/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /training records/i })).toBeVisible()
  })

  test('should show recent workouts section or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    // Wait for loading to finish
    await page.waitForTimeout(2000)
    await expect(page.locator('.record-register').filter({ hasText: /recent sessions/i })).toBeVisible()
    await expect(page.locator('.record-register__row, .record-state-panel').first()).toBeVisible()
  })

  test('should navigate to history page via quick action', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    await page.getByRole('button', { name: /full history/i }).click()
    await expect(page).toHaveURL(/\/workout\/history/)
  })

  test('should navigate to exercises page via quick action', async ({ authenticatedPage: page }) => {
    await page.goto('/workout')
    await page.getByRole('button', { name: /open exercises/i }).click()
    await expect(page).toHaveURL(/\/workout\/exercises/)
  })
})
