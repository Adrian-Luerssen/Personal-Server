import { test, expect } from '@playwright/test'

test.describe('Register Page', () => {
  test('should display registration form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /register|sign up|create/i })).toBeVisible()
  })

  test('should have link to login', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('link', { name: /login|sign in/i })).toBeVisible()
  })
})
