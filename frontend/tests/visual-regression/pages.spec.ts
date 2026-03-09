import { test, expect } from '@playwright/test'

test.describe('Visual Regression - Public Pages', () => {
  test('landing page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('landing.png', { maxDiffPixelRatio: 0.001 })
  })

  test('login page', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('login.png', { maxDiffPixelRatio: 0.001 })
  })

  test('register page', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('register.png', { maxDiffPixelRatio: 0.001 })
  })
})
