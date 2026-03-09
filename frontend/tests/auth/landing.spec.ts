import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should display hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible()
  })

  test('should navigate to register', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /get started/i }).click()
    await expect(page).toHaveURL(/\/register/)
  })

  test('should navigate to login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /login/i }).first().click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('should display feature cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[class*="feature"]')).toHaveCount(5)
  })
})
