import { test, expect } from '../fixtures/auth'

test.describe('Connections Settings', () => {
  async function openConnections(page) {
    await page.goto('/settings')
    await page.getByRole('button', { name: /^connections/i }).click()
  }

  test('should navigate to connections tab', async ({ authenticatedPage: page }) => {
    await openConnections(page)
    await expect(page).toHaveURL(/tab=connections/)
    await expect(page.getByRole('heading', { name: /spotify connection/i })).toBeVisible()
  })

  test('should show connection elements', async ({ authenticatedPage: page }) => {
    await openConnections(page)
    await expect(page.getByRole('button', { name: /oauth/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /manual/i })).toBeVisible()
  })

  test('should show connect or disconnect buttons', async ({ authenticatedPage: page }) => {
    await openConnections(page)
    await expect(page.getByRole('button', { name: /connect with spotify|disconnect spotify/i })).toBeVisible()
  })
})
