import { test, expect } from '@playwright/test'

async function mockNativeApi(page, options: { emptyTransactions?: boolean; malformedWorkoutPrs?: boolean } = {}) {
  const habits = [
    {
      id: 'sleep',
      name: 'Sleep',
      iconName: 'moon',
      color: '#60a5fa',
      trackingType: 'boolean',
      frequencyType: 'daily',
      frequencyTarget: 1,
      isActive: true,
    },
    {
      id: 'caffeine',
      name: 'Caffeine',
      iconName: 'coffee',
      color: '#fbbf24',
      trackingType: 'numeric',
      frequencyType: 'daily',
      frequencyTarget: 1,
      numericUnit: 'cups',
      numericPassThreshold: 1,
      numericSkipThreshold: 2,
      isActive: true,
    },
  ]
  const today = new Date().toISOString().slice(0, 10)
  const monthKey = today.slice(0, 7)
  const financeWallets = [
    { id: 'wallet-revolut', name: 'Revolut', balance: 878.76, currency: 'EUR', iconName: 'wallet', colour: '#60a5fa' },
    { id: 'wallet-bank', name: 'Santander', balance: 129.42, currency: 'EUR', iconName: 'landmark', colour: '#f87171' },
  ]
  const financeCategories = [
    { id: 'cat-food', name: 'Food', iconName: 'utensils', colour: '#4ade80', isIncome: false },
    { id: 'cat-events', name: 'Events', iconName: 'party-popper', colour: '#f472b6', isIncome: false },
    { id: 'cat-salary', name: 'Salary', iconName: 'briefcase', colour: '#22c55e', isIncome: true },
  ]
  const financeTransactions = [
    {
      id: 'tx-1',
      name: 'Dinner',
      amount: 42.3,
      isIncome: false,
      transactionDate: `${monthKey}-24`,
      wallet: financeWallets[0],
      walletId: financeWallets[0].id,
      category: financeCategories[0],
      categoryId: financeCategories[0].id,
    },
    {
      id: 'tx-2',
      name: 'Concert',
      amount: 55,
      isIncome: false,
      transactionDate: `${monthKey}-22`,
      wallet: financeWallets[1],
      walletId: financeWallets[1].id,
      category: financeCategories[1],
      categoryId: financeCategories[1].id,
    },
  ]
  await page.route('https://api.github.com/repos/Adrian-Luerssen/Personal-Server/releases/latest', async (route) => {
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-current-release',
        tag_name: 'android-v0.0.1',
        name: 'Personal Server Android v0.0.1',
        published_at: '2026-06-24T09:00:00.000Z',
        assets: [],
      }),
    })
  })

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = route.request().method()

    if (path === '/auth/refresh') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'native-access', refreshToken: 'native-refresh' }),
      })
    }

    if (path === '/sync/watermarks') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ watermarks: {} }) })
    }

    if (path === '/app/versions/status') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          installedVersion: '0.0.1',
          updateAvailable: false,
          updateRequired: false,
          latest: null,
          installed: null,
        }),
      })
    }

    if (path === '/dashboard/mobile') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: '2026-06-24T09:00:00.000Z',
          sync: {
            checkedAt: '2026-06-24T09:00:00.000Z',
            watermarks: {},
          },
          intelligence: {
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
          },
          spotify: {
            stats: { totalStreams: 128, uniqueArtists: 42 },
          },
          workout: {
            totals: { totalWorkouts: 3, totalVolume: 12000, totalSets: 42, totalReps: 320 },
            recentSessions: [{ name: 'Upper body', date: '2026-06-23T09:00:00.000Z' }],
          },
          habits: {
            today: [
              {
                habitId: 'sleep',
                habitName: 'Sleep',
                completedToday: true,
                todayStatus: 'success',
                longestStreak: 8,
              },
              {
                habitId: 'mobility',
                habitName: 'Mobility',
                completedToday: false,
                todayStatus: 'missed',
                longestStreak: 4,
              },
            ],
            dailyCompletions: [],
          },
          finance: {
            monthlySpent: 247,
            summary: { totalExpense: -247 },
          },
          weeklySummary: { workouts: 3, habitsCompleted: 9, habitsTotal: 12, spending: 247, streams: 128 },
          workoutHabitCorrelation: {
            workoutDays: { completionRate: 84 },
            restDays: { completionRate: 62 },
            totalWorkoutDays: 3,
          },
        }),
      })
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

    if (path === '/streams/user-ranking') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          timeframe: url.searchParams.get('timeframe') || 'week',
          items: [
            {
              accountId: 'spotify-1',
              rank: 1,
              displayName: 'Arianna Caballero',
              spotifyUserId: '11145917586',
              streamCount: 4590,
              uniqueTracks: 280,
              msListened: 98280000,
              lastStream: '2026-06-24T20:00:00.000Z',
              profileImageUrl: 'https://example.com/avatar.jpg',
            },
            {
              accountId: 'spotify-2',
              rank: 2,
              displayName: 'Pau Coderch',
              spotifyUserId: 'rukiirukii90',
              streamCount: 3310,
              uniqueTracks: 198,
              msListened: 71100000,
              lastStream: '2026-06-24T19:00:00.000Z',
            },
          ],
        }),
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

    if (path === '/habits' && method === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(habits) })
    }

    if (path === '/habits/summary') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'sleep', name: 'Sleep', completedToday: false, todayStatus: 'none', selectedStatus: 'none', currentStreak: 0, longestStreak: 8, successRate: 92 },
          { id: 'caffeine', name: 'Caffeine', completedToday: false, todayStatus: 'none', selectedStatus: 'none', currentStreak: 0, longestStreak: 4, successRate: 77 },
        ]),
      })
    }

    if (path === `/habits/calendar/${monthKey}`) {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          habits: { sleep: habits[0], caffeine: habits[1] },
          entries: [],
        }),
      })
    }

    if (path === `/habits/progress/${monthKey}`) {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ weekly: {}, monthly: [], yearly: [] }),
      })
    }

    if (/^\/habits\/[^/]+\/entries$/.test(path) && method === 'POST') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    }

    if (/^\/habits\/[^/]+\/entries\/[^/]+$/.test(path) && method === 'PATCH') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    }

    if (path === '/habits/trends') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) })
    }

    if (path === '/finance/transactions/summary') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          totalIncome: 2488.76,
          totalExpense: -1250.31,
          totalExpenses: -1250.31,
          topExpenseCategories: [
            { categoryId: 'cat-food', categoryName: 'Food', categoryIcon: 'utensils', categoryColour: '#4ade80', total: -490 },
            { categoryId: 'cat-events', categoryName: 'Events', categoryIcon: 'party-popper', categoryColour: '#f472b6', total: -210 },
          ],
        }),
      })
    }

    if (path === '/finance/wallets') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(financeWallets) })
    }

    if (path === '/finance/categories') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(financeCategories) })
    }

    if (path === '/finance/transactions' && method === 'POST') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'tx-new' }) })
    }

    if (path === '/finance/transactions' && method === 'GET') {
      const items = options.emptyTransactions ? [] : financeTransactions
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ items, total: items.length }),
      })
    }

    if (path === '/finance/transactions/transfer') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'tx-transfer' }) })
    }

    if (path === '/workout/sessions/active') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(null) })
    }

    if (path === '/workout/sessions/recent') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([{ name: 'Upper body', date: '2026-06-23T09:00:00.000Z' }]),
      })
    }

    if (path === '/workout/bodyweight') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
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

    if (path === '/workout/sessions/prs') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(options.malformedWorkoutPrs ? { records: [] } : []),
      })
    }

    if (path === '/finance/budgets/status' || path === '/chat/conversations') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
    }

    if (path === '/spotify/linked') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ linked: true }) })
    }

    if (path === '/media') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'media-1',
              title: 'Blue Exorcist',
              type: 'anime',
              status: 'paused',
              rating: 7,
              metadata: { episodesWatched: 37, episodes: 73, tags: ['anime'] },
            },
          ],
          total: 1,
        }),
      })
    }

    if (path === '/media/stats') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ total: 1, byStatus: {}, byType: {} }) })
    }

    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) })
  })
}

async function enableNativeSession(page) {
  await mockNativeApi(page)
  await page.addInitScript(() => {
    ;(window as any).Capacitor = { isNativePlatform: () => true }
    localStorage.setItem('accessToken', 'native-access')
    localStorage.setItem('refreshToken', 'native-refresh')
  })
}

async function getHorizontalOverflowReport(page) {
  return page.evaluate(() => {
    const isVisible = (element: Element) => {
      const box = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
    }
    const selectorFor = (element: Element) => {
      if (element.id) return `#${element.id}`
      const testId = element.getAttribute('data-testid')
      if (testId) return `[data-testid="${testId}"]`
      const className = [...element.classList].slice(0, 3).map((name) => `.${name}`).join('')
      return `${element.tagName.toLowerCase()}${className}`
    }
    const scrollable = [...document.querySelectorAll('body *')]
      .filter(isVisible)
      .map((element) => {
        const style = window.getComputedStyle(element)
        return {
          selector: selectorFor(element),
          overflowX: style.overflowX,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }
      })
      .filter((item) => ['auto', 'scroll'].includes(item.overflowX) && item.scrollWidth > item.clientWidth + 1)

    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      scrollable,
    }
  })
}

test.describe('Native Android app shell', () => {
  test.use({
    viewport: { width: 486, height: 962 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
  })

  test('opens into the native dashboard with stable app navigation', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/')

    await expect(page).toHaveURL(/\/home$/)
    await expect(page.locator('[data-testid="native-dashboard"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /habits logged/i })).toBeVisible()
    await expect(page.getByText(/mobility/i)).toBeVisible()
    await expect(page.locator('.native-tabbar__item', { hasText: 'Today' })).toBeVisible()
    await expect(page.locator('.native-tabbar__item', { hasText: 'Menu' })).toBeVisible()
    await expect(page.locator('.native-tabbar__item', { hasText: 'Assistant' })).toBeVisible()
    await expect(page.locator('.native-app-switcher__item')).toHaveCount(0)
    const switcher = page.getByRole('button', { name: /switch app/i })
    await expect(switcher).toContainText('Apps')
    await expect(switcher).toHaveAccessibleName(/current app Overview/i)
    await expect(page.getByRole('button', { name: /open settings/i })).toBeVisible()
    await expect(page.locator('.native-tabbar__item')).toHaveCount(3)
    await expect(page.getByRole('link', { name: /download android app/i })).toHaveCount(0)
  })

  test('opens app switching from a compact header control instead of a top nav row', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/habits')

    const switcher = page.getByRole('button', { name: /switch app/i })
    await expect(switcher).toContainText('Apps')
    await expect(switcher).toHaveAccessibleName(/current app Habits/i)
    await switcher.click()
    await expect(page.getByRole('dialog', { name: /switch app/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /training workout log/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /money finance/i })).toBeVisible()
  })

  test('adapts native navigation to the current app section', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance')

    await expect(page.getByRole('button', { name: /switch app/i })).toHaveAccessibleName(/current app Money/i)
    await expect(page.locator('.native-tabbar__item')).toHaveText([
      /Summary/,
      /Transactions/,
    ])
    await expect(page.locator('.native-tabbar__item', { hasText: /setup|import/i })).toHaveCount(0)

    await page.goto('/workout')

    await expect(page.getByRole('button', { name: /switch app/i })).toHaveAccessibleName(/current app Training/i)
    await expect(page.locator('.native-tabbar__item')).toHaveText([
      /Today/,
      /Active/,
      /History/,
      /Exercises/,
    ])

    await page.goto('/habits')

    await expect(page.getByRole('button', { name: /switch app/i })).toHaveAccessibleName(/current app Habits/i)
    await expect(page.locator('.native-tabbar__item')).toHaveText([
      /Today/,
      /Plan/,
      /History/,
      /Insights/,
    ])
    await expect(page.locator('.native-tabbar__item', { hasText: /manage|reminders|import/i })).toHaveCount(0)
  })

  test('uses a transaction-card native finance dashboard instead of desktop tables', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance')

    await expect(page.getByTestId('native-finance-dashboard')).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Money$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /add expense/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /add income/i })).toBeVisible()
    await expect(page.getByText('Dinner')).toBeVisible()
    await expect(page.locator('table')).toHaveCount(0)
  })

  test('uses a native transaction feed with quick filters', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance/transactions')

    await expect(page.getByTestId('native-finance-transactions')).toBeVisible()
    await expect(page.getByRole('button', { name: /^expense$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^income$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^transfer$/i })).toBeVisible()
    await expect(page.getByText('Concert')).toBeVisible()
    await expect(page.locator('table')).toHaveCount(0)
  })

  test('keeps the transaction add action aligned with the feed header when the feed is empty', async ({ page }) => {
    await mockNativeApi(page, { emptyTransactions: true })
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance/transactions')

    const feedCard = page.locator('.native-finance-card', { hasText: 'Feed' })
    await expect(feedCard.getByText(/no transactions match this view/i)).toBeVisible()
    await expect(page.locator('.native-finance-floating-add')).toHaveCount(0)
    await expect(feedCard.getByRole('button', { name: /add transaction/i })).toBeVisible()

    const alignment = await feedCard.evaluate((card) => {
      const cardBox = card.getBoundingClientRect()
      const addButton = card.querySelector('[aria-label="Add transaction"]')?.getBoundingClientRect()
      const emptyState = card.querySelector('.native-empty-state')?.getBoundingClientRect()
      return {
        addInsideCard: Boolean(addButton && addButton.right <= cardBox.right + 1 && addButton.left >= cardBox.left - 1),
        addAboveEmptyState: Boolean(addButton && emptyState && addButton.bottom <= emptyState.top + 1),
      }
    })

    expect(alignment).toEqual({ addInsideCard: true, addAboveEmptyState: true })
  })

  test('opens an app-native transaction sheet with keypad and fast pickers', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance')
    await page.getByRole('button', { name: /add expense/i }).click()

    const sheet = page.getByTestId('native-transaction-form')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText(/^Add Transaction$/i)).toBeVisible()
    await expect(sheet.getByRole('button', { name: /^7$/ })).toBeVisible()
    await expect(sheet.getByRole('button', { name: /food/i })).toBeVisible()
    await expect(sheet.getByRole('button', { name: /revolut/i })).toBeVisible()
    await expect(sheet.getByRole('button', { name: /^save$/i })).toBeVisible()
  })

  test('lets numeric habits be adjusted with direct mobile stepper controls', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/habits')

    const caffeine = page.getByTestId('native-habit-card-caffeine')
    await expect(caffeine).toBeVisible()
    await expect(caffeine.getByRole('button', { name: /increase caffeine/i })).toBeVisible()
    await caffeine.getByRole('button', { name: /increase caffeine/i }).click()
    await expect(caffeine.getByLabel(/caffeine value/i)).toHaveValue('1')
  })

  test('does not preselect a boolean habit decision before the user logs it', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/habits')

    const sleep = page.getByTestId('native-habit-card-sleep')
    await expect(sleep).toBeVisible()

    for (const label of ['Done', 'Skip', 'Missed']) {
      const button = sleep.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })
      await expect(button).toHaveAttribute('aria-pressed', 'false')
      await expect(button).not.toHaveClass(/is-active/)
    }
  })

  test('provides a searchable native menu for all major app sections', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/menu')

    const dailyActions = page.getByRole('region', { name: /^daily actions$/i })
    const libraryAndInsights = page.getByRole('region', { name: /^library and insights$/i })
    const imports = page.getByRole('region', { name: /^settings and data$/i })
    const appControl = page.getByRole('region', { name: /^app control$/i })

    await expect(page.getByRole('heading', { name: /^menu$/i })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: /search app sections/i })).toBeVisible()
    await expect(dailyActions.getByRole('link', { name: /^habits\b/i })).toBeVisible()
    await expect(dailyActions.getByRole('link', { name: /^workout\b/i })).toBeVisible()
    await expect(libraryAndInsights.getByRole('link', { name: /^finance\b/i })).toBeVisible()
    await expect(libraryAndInsights.getByRole('link', { name: /^spotify ranking\b/i })).toBeVisible()
    await expect(libraryAndInsights.getByRole('link', { name: /^media library\b/i })).toBeVisible()
    await expect(imports.getByRole('link', { name: /^import habits\b/i })).toBeVisible()
    await expect(imports.getByRole('link', { name: /^finance settings\b/i })).toBeVisible()
    await expect(imports.getByRole('link', { name: /^import media\b/i })).toBeVisible()
    await expect(appControl.getByRole('link', { name: /^sync and offline\b/i })).toBeVisible()
    await expect(appControl.getByRole('link', { name: /^app updates\b/i })).toBeVisible()
  })

  test('shows native settings sections for notifications sync and updates', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /notifications/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sync and offline/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /app updates/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /settings and data/i })).toBeVisible()
    await expect(page.locator('.tab-btn')).toHaveCount(0)

    await page.getByRole('button', { name: /settings and data/i }).click()
    await expect(page.getByRole('link', { name: /import habits/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /finance settings/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /import workouts/i })).toBeVisible()
  })

  test('keeps native notification switches inside their settings rows', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/settings?section=notifications')

    await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible()
    const switchReport = await page.evaluate(() => {
      return [...document.querySelectorAll('.native-toggle-row')].map((row) => {
        const rowBox = row.getBoundingClientRect()
        const switchBox = row.querySelector('.native-toggle-row__switch')?.getBoundingClientRect()
        return {
          label: row.textContent?.trim() || '',
          switchInsideRow: Boolean(switchBox && switchBox.left >= rowBox.left - 1 && switchBox.right <= rowBox.right + 1),
          rowDoesNotOverflow: row.scrollWidth <= row.clientWidth + 1,
        }
      })
    })

    expect(switchReport.length).toBeGreaterThan(0)
    for (const row of switchReport) {
      expect(row, row.label).toMatchObject({ switchInsideRow: true, rowDoesNotOverflow: true })
    }
  })

  test('shows native widget controls with Samsung lock-screen guidance', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = {
        isNativePlatform: () => true,
        Plugins: {
          PersonalServerWidgets: {
            getWidgetStatus: async () => ({
              supported: true,
              pinningSupported: true,
              lockScreenEligible: true,
              lockScreenAvailability: 'Samsung One UI may only expose Samsung-approved lock-screen widgets.',
            }),
            refreshWidgets: async () => ({}),
          },
        },
      }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/settings')

    await expect(page.getByRole('button', { name: /widgets/i })).toBeVisible()
    await page.getByRole('button', { name: /widgets/i }).click()
    await expect(page.getByRole('heading', { name: 'Widgets', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Home-screen widgets' })).toBeVisible()
    await expect(page.getByText(/Use Samsung Lock screen settings first/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /refresh widgets/i })).toBeVisible()
  })

  test('keeps the workout page usable when PR data has an unexpected shape', async ({ page }) => {
    await mockNativeApi(page, { malformedWorkoutPrs: true })
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/workout')

    await expect(page.getByRole('heading', { name: /^workout$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /start workout/i })).toBeVisible()
    await expect(page.getByText(/no personal records yet/i)).toBeVisible()
  })

  test('keeps native dashboard content clear of the bottom tabbar', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
      { width: 486, height: 962 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/home')
      await expect(page.locator('[data-testid="native-dashboard"]')).toBeVisible()
      await page.evaluate(() => {
        const scroller = [
          document.querySelector('#root'),
          document.querySelector('.content'),
          document.scrollingElement,
          document.documentElement,
        ].find((element) => element && element.scrollHeight > element.clientHeight) || document.documentElement
        scroller.scrollTop = scroller.scrollHeight
      })
      await page.waitForFunction(() => {
        const scroller = [
          document.querySelector('#root'),
          document.querySelector('.content'),
          document.scrollingElement,
          document.documentElement,
        ].find((element) => element && element.scrollHeight > element.clientHeight) || document.documentElement
        const viewportHeight = scroller === document.scrollingElement || scroller === document.documentElement
          ? window.innerHeight
          : scroller.clientHeight
        return scroller.scrollTop + viewportHeight >= scroller.scrollHeight - 2
      })

      const clearance = await page.evaluate(() => {
        const tabbar = document.querySelector('.native-tabbar')?.getBoundingClientRect()
        const dashboard = document.querySelector('[data-testid="native-dashboard"]')
        const lastChild = dashboard?.lastElementChild?.getBoundingClientRect()
        const touchTargets = [...document.querySelectorAll('.native-tabbar__item, .native-habit-row__actions button')]
          .map((el) => el.getBoundingClientRect())
        return {
          tabbarTop: tabbar?.top ?? 0,
          lastChildBottom: lastChild?.bottom ?? 0,
          minTarget: Math.min(...touchTargets.map((box) => Math.min(box.width, box.height))),
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }
      })

      expect(clearance.scrollWidth).toBeLessThanOrEqual(clearance.innerWidth + 1)
      expect(clearance.minTarget).toBeGreaterThanOrEqual(44)
      expect(clearance.lastChildBottom).toBeLessThanOrEqual(clearance.tabbarTop - 8)
    }
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
      expect(metrics.minInputHeight).toBeGreaterThanOrEqual(55.5)
      expect(metrics.minButtonHeight).toBeGreaterThanOrEqual(55.5)
      expect(metrics.minModeHeight).toBeGreaterThanOrEqual(43.5)
    }
  })

  test('has no horizontal scrolling on native app routes', async ({ page }) => {
    test.setTimeout(120000)
    await enableNativeSession(page)

    const routes = [
      '/home',
      '/menu',
      '/settings',
      '/settings?section=data',
      '/settings?section=widgets',
      '/habits',
      '/habits?view=plan',
      '/habits?view=history',
      '/habits?view=insights',
      '/workout',
      '/finance',
      '/finance/transactions',
      '/spotify/ranking',
      '/media',
      '/chat',
    ]

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 486, height: 962 },
    ]) {
      await page.setViewportSize(viewport)
      for (const route of routes) {
        await page.goto(route, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(100)
        const report = await getHorizontalOverflowReport(page)
        expect(
          report,
          `${route} at ${viewport.width}px should not create page or local horizontal scroll`,
        ).toEqual({
          viewportWidth: viewport.width,
          documentScrollWidth: expect.any(Number),
          bodyScrollWidth: expect.any(Number),
          scrollable: [],
        })
        expect(report.documentScrollWidth).toBeLessThanOrEqual(report.viewportWidth + 1)
        expect(report.bodyScrollWidth).toBeLessThanOrEqual(report.viewportWidth + 1)
      }
    }
  })
})
