import { test, expect } from '../fixtures/auth'

test.describe('Today', () => {
  test('should display the open-record brief after login', async ({ authenticatedPage: page }) => {
    await page.goto('/home')
    await expect(page.locator('[data-testid="today-dashboard"]')).toBeVisible()
    await expect(page.locator('.record-page-heading h1')).toContainText(/today is clear|records? needs? you/i)
  })

  test('should make the source of the daily brief inspectable', async ({ authenticatedPage: page }) => {
    await page.goto('/home')
    await expect(page.getByRole('heading', { name: /open records/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /record sources/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /ask from records/i })).toBeVisible()
  })

  test('should have the stable desktop record rail', async ({ authenticatedPage: page }) => {
    await page.goto('/home')
    await expect(page.getByRole('navigation', { name: /primary/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /cash/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /gym/i })).toBeVisible()
  })
})
