import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should display hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('link', { name: /create account/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  })

  test('should navigate to register', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /create account/i }).first().click()
    await expect(page).toHaveURL(/\/register/)
  })

  test('should navigate to login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /sign in/i }).first().click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('should display the product system and service choices', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.landing-domain-row')).toHaveCount(6)
    await expect(page.getByLabel('Record Today product preview')).toBeVisible()
    await expect(page.locator('.landing-record-preview__row')).toHaveCount(3)
    await expect(page.getByRole('heading', { name: /convenience without giving up control/i })).toBeVisible()
    await expect(page.locator('.landing-service-register article')).toHaveCount(2)
    await expect(page.getByText(/managed service · self-hosted source/i)).toBeVisible()
  })
})
