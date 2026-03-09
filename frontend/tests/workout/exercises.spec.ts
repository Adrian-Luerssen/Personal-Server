import { test, expect } from '../fixtures/auth'

test.describe('Workout Exercises', () => {
  test('should display exercises page with heading', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/exercises')
    await expect(page).toHaveURL(/\/workout\/exercises/)
    await expect(page.locator('h2').filter({ hasText: /Exercises & Categories/i })).toBeVisible({ timeout: 10000 })
  })

  test('should show tab group with exercises and categories tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/exercises')
    const tabGroup = page.locator('.tab-group')
    await expect(tabGroup).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.tab-btn').filter({ hasText: /Exercises/i })).toBeVisible()
    await expect(page.locator('.tab-btn').filter({ hasText: /Categories/i })).toBeVisible()
  })

  test('should show search input and add button', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/exercises')
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button').filter({ hasText: /Add/i })).toBeVisible()
  })

  test('should show exercise list or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/exercises')
    await page.waitForTimeout(2000)
    const hasExercises = await page.locator('.card').nth(1).isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/No exercises found/i).isVisible().catch(() => false)
    expect(hasExercises || hasEmpty).toBeTruthy()
  })

  test('should switch to categories tab', async ({ authenticatedPage: page }) => {
    await page.goto('/workout/exercises')
    await page.locator('.tab-btn').filter({ hasText: /Categories/i }).click()
    // After switching, the Add button text should change
    await expect(page.locator('button').filter({ hasText: /Add Category/i })).toBeVisible()
  })
})
