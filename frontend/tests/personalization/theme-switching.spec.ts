import { test, expect } from '../fixtures/auth'

test.describe('Personalization', () => {
  test('should have theme attribute on html', async ({ authenticatedPage: page }) => {
    const theme = await page.locator('html').getAttribute('data-theme')
    expect(['dark', 'light']).toContain(theme)
  })

  test('should have density attribute on html', async ({ authenticatedPage: page }) => {
    const density = await page.locator('html').getAttribute('data-density')
    expect(['compact', 'comfortable', 'spacious']).toContain(density)
  })
})
