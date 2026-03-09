import { test, expect } from '../fixtures/auth'

test.describe('Workout Bodyweight', () => {
  test('should display bodyweight page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/bodyweight')
    await expect(page).toHaveURL(/\/workout\/bodyweight/)
    await expect(page.locator('h2').filter({ hasText: /Bodyweight/i })).toBeVisible({ timeout: 10000 })
  })

  test('should show stat cards for weight data', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/bodyweight')
    await expect(page.locator('.stat-grid').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show log weight button', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/bodyweight')
    await expect(page.locator('button').filter({ hasText: /Log Weight/i })).toBeVisible({ timeout: 10000 })
  })

  test('should show weight entries or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/bodyweight')
    await page.waitForTimeout(2000)
    const hasEntries = await page.getByText(/Recent Entries/i).isVisible().catch(() => false)
    const hasChart = await page.getByText(/Weight Over Time/i).isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/No bodyweight entries/i).isVisible().catch(() => false)
    expect(hasEntries || hasChart || hasEmpty).toBeTruthy()
  })

  test('should open log weight modal on button click', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/bodyweight')
    await page.locator('button').filter({ hasText: /Log Weight/i }).click()
    // Modal should appear with date and weight inputs
    await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="number"]')).toBeVisible()
  })
})
