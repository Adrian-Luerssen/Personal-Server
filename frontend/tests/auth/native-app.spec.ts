import { test, expect } from '@playwright/test'

async function mockNativeApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace(/^\/api/, '')

    if (path === '/auth/refresh') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'native-access', refreshToken: 'native-refresh' }),
      })
    }

    if (path === '/sync/watermarks') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ watermarks: {} }) })
    }

    if (path === '/dashboard/intelligence') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          focus: 'steady',
          score: 64,
          headline: 'Today is under control',
          summary: 'Compact native dashboard summary.',
          snapshot: [],
          insights: [
            {
              id: 'native-insight',
              title: 'Training supports consistency',
              summary: 'Habits are stronger on workout days.',
              tone: 'positive',
              domains: ['workout', 'habits'],
            },
          ],
          aiPrompts: [
            {
              id: 'native-review',
              label: 'Review today',
              prompt: 'Review my current day.',
              pageContext: { route: '/home', pageType: 'dashboard' },
            },
          ],
        }),
      })
    }

    if (path === '/streams/stats') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ totalStreams: 128, uniqueArtists: 42 }),
      })
    }

    if (path === '/workout/sessions') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ totalWorkouts: 3, totalVolume: 12000, totalSets: 42, totalReps: 320 }),
      })
    }

    if (path === '/dashboard/streams/workout') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ streams: 21, totalTimeSeconds: 3600 }),
      })
    }

    if (path === '/habits/summary') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          { name: 'Sleep', completedToday: true, todayStatus: 'success', longestStreak: 8 },
          { name: 'Mobility', completedToday: false, todayStatus: 'missed', longestStreak: 4 },
        ]),
      })
    }

    if (path === '/habits/trends') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) })
    }

    if (path === '/finance/transactions/summary') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ totalExpenses: -247 }) })
    }

    if (path === '/workout/sessions/recent') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([{ name: 'Upper body', date: '2026-06-23T09:00:00.000Z' }]),
      })
    }

    if (path === '/dashboard/insights/weekly') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ workouts: 3, habitsCompleted: 9, habitsTotal: 12, spending: 247, streams: 128 }),
      })
    }

    if (path === '/dashboard/insights/workout-habits') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          workoutDays: { completionRate: 84 },
          restDays: { completionRate: 62 },
          totalWorkoutDays: 3,
        }),
      })
    }

    if (path === '/finance/budgets/status' || path === '/workout/sessions/prs' || path === '/chat/conversations') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
    }

    if (path === '/spotify/linked') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ linked: true }) })
    }

    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) })
  })
}

test.describe('Native Android app shell', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
  })

  test('opens into the native dashboard with labeled app navigation', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/')

    await expect(page).toHaveURL(/\/home$/)
    await expect(page.locator('[data-testid="native-dashboard"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Today is under control' })).toBeVisible()
    await expect(page.getByRole('link', { name: /today/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /train/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /habits/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /money/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /music/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /download android app/i })).toHaveCount(0)
  })

  test('opens the app login instead of the mobile landing when signed out', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as any).__NATIVE_APP__ = true
      localStorage.clear()
    })

    await page.goto('/')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /^register$/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /download android app/i })).toHaveCount(0)
    await expect(page.locator('.landing-editorial')).toHaveCount(0)
  })

  test('keeps native auth screens usable across small Android viewports', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as any).__NATIVE_APP__ = true
      localStorage.clear()
    })

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(viewport)

      await page.goto('/login')
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /^register$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()

      await page.goto('/register')
      await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /^login$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /^register$/i })).toBeVisible()
      await expect(page.locator('input[name="name"]')).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()

      const metrics = await page.evaluate(() => {
        const inputs = [...document.querySelectorAll('.auth-input')].map((input) => input.getBoundingClientRect().height)
        const buttons = [...document.querySelectorAll('.auth-form .btn')].map((button) => button.getBoundingClientRect().height)
        const modeItems = [...document.querySelectorAll('.auth-mode-switch__item')].map((item) => item.getBoundingClientRect().height)
        return {
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          minInputHeight: Math.min(...inputs),
          minButtonHeight: Math.min(...buttons),
          minModeHeight: Math.min(...modeItems),
        }
      })

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth)
      expect(metrics.minInputHeight).toBeGreaterThanOrEqual(56)
      expect(metrics.minButtonHeight).toBeGreaterThanOrEqual(56)
      expect(metrics.minModeHeight).toBeGreaterThanOrEqual(44)
    }
  })
})
