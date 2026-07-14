import { test, expect } from '../fixtures/auth'

test.describe('Appearance Settings', () => {
  test('should display appearance tab', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: /^appearance/i }).click()
    await expect(page.getByRole('heading', { name: /one visual language, everywhere/i })).toBeVisible()
  })

  test('should offer density without fragmenting the product identity', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: /^appearance/i }).click()
    const density = page.getByRole('radiogroup', { name: /interface density/i })
    await expect(density).toBeVisible()
    await expect(density.getByRole('radio')).toHaveCount(3)
    await expect(page.getByText(/product colors and navigation placement are intentionally protected/i)).toBeVisible()
  })
})
