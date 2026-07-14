import { test, expect } from '@playwright/test'

test.describe('Record icon laboratory', () => {
  test('exposes fifty meaningful SVG studies in five complete semantic families', async ({ page }) => {
    await page.goto('/icon-lab/index.html')

    const cards = page.locator('[data-icon-card]')
    await expect(cards).toHaveCount(50)
    await expect(page.locator('[data-family]')).toHaveCount(5)

    const names = await cards.locator('h2').allTextContents()
    expect(new Set(names).size).toBe(50)
    const variants = await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-variant')))
    expect(new Set(variants).size).toBe(50)

    for (const family of ['archive', 'capture', 'continuity', 'life', 'signature']) {
      await expect(page.locator(`[data-icon-card][data-family-name="${family}"]`)).toHaveCount(10)
    }

    await expect(page.locator('[data-icon-card] .stage')).toHaveCount(50)
    await expect(page.locator('[data-icon-card] svg.mark')).toHaveCount(50)
    await expect(page.locator('[data-icon-card] [data-meaning]')).toHaveCount(50)
    await expect(page.locator('[data-icon-card] [data-action]')).toHaveCount(50)
    await expect(page.locator('[data-icon-card] [data-motion-part]')).toHaveCount(50)
    await expect(page.locator('[data-icon-card] .frames')).toHaveCount(50)
    await expect(page.locator('[data-icon-card] .frame')).toHaveCount(150)

    const meanings = await page.locator('[data-meaning]').allTextContents()
    expect(meanings.every((meaning) => meaning.trim().length >= 24)).toBe(true)
  })

  test('supports filtering, pausing, replaying, and density changes', async ({ page }) => {
    await page.goto('/icon-lab/index.html')

    const pause = page.getByRole('button', { name: 'Pause animations' })
    await pause.click()
    await expect(page.locator('body')).toHaveClass(/is-paused/)
    await expect(page.getByRole('button', { name: 'Play animations', exact: true })).toBeVisible()

    const replay = page.getByRole('button', { name: 'Replay animations' })
    await replay.click()
    await expect(page.locator('body')).not.toHaveClass(/is-paused/)

    await page.getByRole('button', { name: 'Show Capture icons' }).click()
    await expect(page.locator('[data-icon-card]:visible')).toHaveCount(10)
    await expect(page.locator('[data-filter="capture"]')).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Use compact view' }).click()
    await expect(page.locator('body')).toHaveClass(/is-compact/)
  })

  test('keeps a stable static state when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/icon-lab/index.html')

    await expect(page.locator('body')).toHaveAttribute('data-motion', 'reduced')
    const animationDuration = await page.locator('[data-variant="01"] .motion').evaluate((element) =>
      getComputedStyle(element).animationDuration,
    )
    expect(['0.001s', '0s']).toContain(animationDuration)
  })

  test('fits narrow screens without horizontal page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/icon-lab/index.html')

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
  })
})
