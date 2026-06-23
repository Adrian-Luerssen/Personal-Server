import { test, expect, Page } from '@playwright/test'

const today = new Date().toISOString().slice(0, 10)

function addDays(dateStr: string, offset: number) {
  const date = new Date(`${dateStr}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

async function setupHabitsPage(page: Page) {
  const requests: Array<{ method: string; path: string; body: unknown }> = []

  const habits = [
    {
      id: 'habit-1',
      name: 'Morning walk',
      iconName: 'footprints',
      color: '#4ade80',
      isActive: true,
      trackingType: 'boolean',
      frequencyType: 'daily',
      frequencyTarget: 1,
    },
    {
      id: 'habit-2',
      name: 'No Alcohol',
      iconName: 'beer-off',
      color: '#fbbf24',
      isActive: true,
      trackingType: 'numeric',
      frequencyType: 'daily',
      frequencyTarget: 1,
      numericPassThreshold: 0,
      numericSkipThreshold: 2,
      numericUnit: 'drinks',
    },
    {
      id: 'habit-3',
      name: 'Strength training',
      iconName: 'dumbbell',
      color: '#60a5fa',
      isActive: true,
      trackingType: 'boolean',
      frequencyType: 'weekly',
      frequencyTarget: 3,
    },
  ]

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '') || '/'
    const method = request.method()
    let body: unknown = null

    if (request.postData()) {
      try {
        body = request.postDataJSON()
      } catch {
        body = request.postData()
      }
    }

    requests.push({ method, path, body })

    const json = (payload: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      })

    if (path === '/auth/refresh') {
      return json({ accessToken: 'test-access', refreshToken: 'test-refresh' })
    }
    if (path === '/health') return json({ ok: true })
    if (path === '/sync/watermarks') return json({ watermarks: {} })
    if (path === '/chat/conversations') return json([])
    if (path === '/habits' && method === 'GET') return json(habits)
    if (path === '/habits' && method === 'POST') {
      return json({ id: 'habit-created', ...(body as object) })
    }
    if (path === '/habits/summary') {
      return json([
        { habitId: 'habit-1', habitName: 'Morning walk', currentStreak: 4, longestStreak: 9, successRate: 82 },
        { habitId: 'habit-2', habitName: 'No Alcohol', currentStreak: 2, longestStreak: 8, successRate: 74 },
        { habitId: 'habit-3', habitName: 'Strength training', currentStreak: 1, longestStreak: 5, successRate: 68 },
      ])
    }
    if (path.startsWith('/habits/calendar/')) {
      return json({
        habits: {
          'habit-1': habits[0],
          'habit-2': habits[1],
          'habit-3': habits[2],
        },
        entries: [
          { habitId: 'habit-3', date: today, status: 'success', numericValue: null, comment: null },
        ],
      })
    }
    if (path.startsWith('/habits/progress/')) {
      return json({
        weekly: {},
        monthly: [],
        yearly: [],
      })
    }
    if (path === '/habits/heatmap') {
      return json([{ date: today, count: 1, total: 3 }])
    }
    if (/^\/habits\/[^/]+\/entries$/.test(path) && method === 'POST') {
      return json({ id: 'entry-created', ...(body as object) })
    }
    if (/^\/habits\/[^/]+\/entries\/[^/]+$/.test(path) && method === 'PATCH') {
      return json({ ok: true, ...(body as object) })
    }
    if (/^\/habits\/[^/]+\/entries\/[^/]+$/.test(path) && method === 'DELETE') {
      return json({ ok: true })
    }

    return json({})
  })

  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'test-access')
    localStorage.setItem('refreshToken', 'test-refresh')
    localStorage.removeItem('ps-api-cache')
    localStorage.removeItem('ps-sync-watermarks')
  })

  await page.goto('/habits', { waitUntil: 'commit' })
  await expect(page.getByRole('heading', { name: 'Habits' })).toBeVisible({ timeout: 30000 })

  return { requests }
}

test.describe('Habits Page', () => {
  test('prioritizes selected-day logging with secondary navigation available', async ({ page }) => {
    await setupHabitsPage(page)

    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Habit/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Import/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Settings/i })).toBeVisible()
    await expect(page.getByText('Needs log')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Logged' })).toBeVisible()
    await expect(page.getByTestId('habit-row-habit-1')).toContainText('Morning walk')
    await expect(page.getByTestId('habit-row-habit-2')).toContainText('No Alcohol')
  })

  test('records a boolean habit with an explicit status button', async ({ page }) => {
    const { requests } = await setupHabitsPage(page)

    await page.getByTestId('habit-row-habit-1').getByRole('button', { name: 'Done' }).click()

    await expect
      .poll(() => requests.find((r) => r.method === 'POST' && r.path === '/habits/habit-1/entries')?.body)
      .toEqual({ date: today, status: 'success' })
    await expect(page.getByTestId('habit-row-habit-1')).toContainText('Done')
  })

  test('saves a numeric habit through a visible save action', async ({ page }) => {
    const { requests } = await setupHabitsPage(page)
    const row = page.getByTestId('habit-row-habit-2')

    await row.getByLabel('No Alcohol value').fill('1')
    await row.getByRole('button', { name: 'Save' }).click()

    await expect
      .poll(() => requests.find((r) => r.method === 'POST' && r.path === '/habits/habit-2/entries')?.body)
      .toEqual({ date: today, numericValue: 1 })
    await expect(row).toContainText('Skip')
  })

  test('logs the currently selected date instead of always using today', async ({ page }) => {
    const { requests } = await setupHabitsPage(page)
    const yesterday = addDays(today, -1)

    await page.getByRole('button', { name: 'Previous day' }).click()
    await page.getByTestId('habit-row-habit-1').getByRole('button', { name: 'Done' }).click()

    await expect
      .poll(() => requests.find((r) => r.method === 'POST' && r.path === '/habits/habit-1/entries')?.body)
      .toEqual({ date: yesterday, status: 'success' })
  })

  test('creates a basic habit without leaving the main habits workflow', async ({ page }) => {
    const { requests } = await setupHabitsPage(page)

    await page.getByRole('button', { name: /Add Habit/i }).click()
    await page.getByLabel('Habit name').fill('Read before bed')
    await page.getByRole('button', { name: 'Create Habit' }).click()

    await expect
      .poll(() => requests.find((r) => r.method === 'POST' && r.path === '/habits')?.body)
      .toEqual({
        name: 'Read before bed',
        color: '#a78bfa',
        iconName: 'circle-check',
        trackingType: 'boolean',
        frequencyType: 'daily',
        frequencyTarget: 1,
      })
  })

  test('keeps import and settings one click away', async ({ page }) => {
    await setupHabitsPage(page)

    await page.getByRole('button', { name: /Import/i }).click()
    await expect(page).toHaveURL(/\/habits\/settings\?tab=import/)
  })
})
