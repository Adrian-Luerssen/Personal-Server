import { test, expect } from '../fixtures/auth'

test.describe('Spotify Personal', () => {
  test('should display spotify page', async ({ authenticatedPage: page }) => {
    await page.goto('/spotify/personal')
    await expect(page).toHaveURL(/\/spotify/)
  })
})
