import { test, expect } from '../fixtures/auth'

test.describe('Responsive - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('should render landing page on mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
  })
})

test.describe('Responsive - Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('should render landing page on tablet', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
  })
})

test.describe('Responsive - Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('should render landing page on desktop', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
  })
})
