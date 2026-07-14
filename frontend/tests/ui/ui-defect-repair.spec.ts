import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'ui-test-access')
    localStorage.setItem('refreshToken', 'ui-test-refresh')
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })

    if (path === '/auth/refresh') return json({ accessToken: 'ui-test-access', refreshToken: 'ui-test-refresh' })
    if (path === '/media/stats') return json({ total: 0, watching: 0, completed: 0, averageRating: null })
    if (path === '/media/catalog/summaries') return json([])
    if (path.startsWith('/media')) return json([])
    if (path === '/workout/sessions/active') return json(null)
    if (path.startsWith('/workout')) return json([])
    if (path === '/habits/summary') return json({ totalHabits: 0, loggedToday: 0, averageSuccess: 0, totalCurrentStreak: 0 })
    if (path.startsWith('/habits/calendar/')) return json({ habits: {}, entries: [] })
    if (path.startsWith('/habits/progress/')) return json([])
    if (path === '/habits/heatmap') return json([])
    if (path.startsWith('/habits')) return json([])
    return json({})
  })
})

test.describe('Screenshot-reported UI repairs', () => {
  test('capture menu is a centered, fully styled dialog', async ({ page }) => {
    await page.goto('/home')
    await page.getByRole('button', { name: 'New record' }).click()

    const dialog = page.getByRole('dialog', { name: 'What happened?' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveCSS('position', 'relative')
    await expect(dialog.locator('.capture-sheet__actions > button')).toHaveCount(6)

    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(500)
    expect(box!.x).toBeGreaterThan(0)
    expect(box!.y).toBeGreaterThan(0)
  })

  test('media search uses a dedicated icon column without text collision', async ({ page }) => {
    await page.goto('/media')
    await page.getByRole('button', { name: 'Add title' }).click()

    const field = page.locator('.media-modal .record-icon-input')
    await expect(field).toBeVisible()
    await expect(field).toHaveCSS('display', 'grid')
    await expect(field.locator('.record-icon-input__icon')).toHaveCSS('width', '38px')
    await expect(field.locator('input')).toHaveCSS('padding-left', '0px')
  })

  test('training register actions have explicit product styling', async ({ page }) => {
    await page.goto('/workout')
    const actions = page.locator('.record-register-action')
    await expect(actions).toHaveCount(3)
    for (const action of await actions.all()) {
      const box = await action.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(40)
      await expect(action).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    }
  })

  test('yearly activity spans the content width and handles an empty year intentionally', async ({ page }) => {
    await page.goto('/habits')
    const yearly = page.locator('.habits-panel--yearly')
    await expect(yearly).toBeVisible()
    await expect(yearly.locator('.habit-heatmap__viewport')).toHaveCSS('overflow-x', 'auto')
    await expect(yearly.locator('.habit-heatmap__empty')).toBeVisible()
  })

  test('category editor exposes a labelled colour picker and selected value', async ({ page }) => {
    await page.goto('/workout/exercises')
    await page.locator('.tab-btn').filter({ hasText: 'Categories' }).click()
    await page.getByRole('button', { name: 'Add Category' }).click()

    await expect(page.getByText('Choose colour', { exact: true })).toBeVisible()
    await expect(page.locator('.record-color-field__value')).toHaveText('#7DD3FC')
    await expect(page.locator('.record-color-field input[type="color"]')).toHaveAttribute('aria-label', /Current value #7DD3FC/)
  })
})
