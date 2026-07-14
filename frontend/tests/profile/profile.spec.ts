import { test, expect } from '../fixtures/auth'

test.describe('Profile compatibility route', () => {
  test('should redirect the old profile route to the unified settings workspace', async ({ authenticatedPage: page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await expect(page.getByRole('navigation', { name: /settings sections/i })).toBeVisible()
  })
})
