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
})
