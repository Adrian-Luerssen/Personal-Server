import { test, expect } from '../fixtures/auth'

test.describe('Developer access settings', () => {
  async function openDeveloperAccess(page) {
    await page.goto('/settings')
    await page.getByRole('button', { name: /^developer access/i }).click()
  }

  test('should navigate to developer access', async ({ authenticatedPage: page }) => {
    await openDeveloperAccess(page)
    await expect(page).toHaveURL(/tab=agent-keys/)
    await expect(page.getByRole('heading', { name: /agent api keys/i })).toBeVisible()
  })

  test('should show key elements', async ({ authenticatedPage: page }) => {
    await openDeveloperAccess(page)
    await expect(page.getByText(/manage api keys for agents to access your data/i)).toBeVisible()
    await expect(page.getByText(/no api keys yet/i).or(page.locator('[class*="api-key"]').first())).toBeVisible()
  })

  test('should show create button', async ({ authenticatedPage: page }) => {
    await openDeveloperAccess(page)
    await expect(page.getByRole('button', { name: /new key|create first key/i }).first()).toBeVisible()
  })
})
