import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should display hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('link', { name: /create account/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /open login/i }).first()).toBeVisible()
  })

  test('should navigate to register', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /create account/i }).first().click()
    await expect(page).toHaveURL(/\/register/)
  })

  test('should navigate to login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /open login/i }).first().click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('should display the product system and service choices', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.landing-domain-row')).toHaveCount(6)
    await expect(page.locator('.landing-stage-next')).toContainText('Review a detected payment')
    await expect(page.locator('.landing-instrument-row')).toHaveCount(5)
    await expect(page.getByText(/managed for convenience\. self-hosted for control/i)).toBeVisible()
    await expect(page.locator('.landing-product-stage')).toBeVisible()
    await expect(page.getByText(/everything you are/i).first()).toBeVisible()
  })
})
