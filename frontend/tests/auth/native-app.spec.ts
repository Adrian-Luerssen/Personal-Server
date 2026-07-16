import { test, expect } from '@playwright/test'

async function mockNativeApi(page, options: { emptyTransactions?: boolean; malformedWorkoutPrs?: boolean; budgetStatus?: any[]; activeWorkout?: boolean; paymentSuggestions?: any[]; mediaItems?: any[]; mediaSearchResults?: any[] } = {}) {
  await page.addInitScript(() => {
    ;(window as any).__NATIVE_APP__ = true
    ;(window as any).__API_BASE__ = 'http://localhost:4051'
  })

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
  let secondEpisodeWatched = false
  const tvItem = {
    id: 'media-tv', title: 'The Bear', type: 'tv', status: 'watching', rating: 8.5,
    coverUrl: '', externalIds: { tmdbId: 136315 },
    metadata: { episodesWatched: 1, episodes: 2, seasons: 1, year: 2022, studios: ['FX'], airingStatus: 'Returning Series' },
  }
  const animeItem = {
    id: 'media-anime', title: 'Blue Exorcist: Kyoto Saga', type: 'anime', status: 'watching', rating: 7.5,
    coverUrl: '', externalIds: { malId: 33506 },
    metadata: { episodesWatched: 6, episodes: 12, year: 2017, studios: ['A-1 Pictures'], mediaFormat: 'TV' },
  }
  const tvCatalog = () => ({
    item: { ...tvItem, metadata: { ...tvItem.metadata, episodesWatched: secondEpisodeWatched ? 2 : 1 } },
    progress: { watched: secondEpisodeWatched ? 2 : 1, total: 2, seasonNumber: 1, episodeNumber: secondEpisodeWatched ? 2 : 1 },
    nextEpisode: secondEpisodeWatched ? null : { id: 'episode-2', seasonNumber: 1, number: 2, title: 'Hands', airDate: '2022-06-23' },
    upcomingEpisode: null,
    relations: [],
    seasons: [{
      id: 'season-1', number: 1, name: 'Season 1', episodeCount: 2,
      episodes: [
        { id: 'episode-1', seasonNumber: 1, number: 1, title: 'System', airDate: '2022-06-23', runtime: 27, watched: true },
        { id: 'episode-2', seasonNumber: 1, number: 2, title: 'Hands', airDate: '2022-06-23', runtime: 30, watched: secondEpisodeWatched },
      ],
    }],
  })
  const animeCatalog = {
    item: animeItem,
    progress: { watched: 6, total: 12, seasonNumber: null, episodeNumber: null },
    nextEpisode: null,
    upcomingEpisode: null,
    seasons: [],
    relations: [
      { id: 'rel-1', relationType: 'prequel', targetMalId: 11757, targetTitle: 'Blue Exorcist' },
      { id: 'rel-2', relationType: 'sequel', targetMalId: 53889, targetTitle: 'Blue Exorcist: Shimane Illuminati Saga' },
    ],
  }
  const monthKey = today.slice(0, 7)
  const financeWallets = [
    { id: 'wallet-revolut', name: 'Revolut', balance: 878.76, currency: 'EUR', iconName: 'wallet', colour: '#60a5fa' },
    { id: 'wallet-bank', name: 'Santander', balance: 129.42, currency: 'EUR', iconName: 'landmark', colour: '#f87171' },
  ]
  const financeCategories = [
    { id: 'cat-food', name: 'Food', iconName: 'utensils', colour: '#4ade80', isIncome: false },
    { id: 'cat-events', name: 'Events', iconName: 'party-popper', colour: '#f472b6', isIncome: false },
    { id: 'cat-rent', name: 'Rent', iconName: 'home', colour: '#fb7185', isIncome: false },
    { id: 'cat-groceries', name: 'Groceries', iconName: 'shopping-basket', colour: '#34d399', isIncome: false },
    { id: 'cat-transport', name: 'Transport', iconName: 'car', colour: '#60a5fa', isIncome: false },
    { id: 'cat-bills', name: 'Bills', iconName: 'receipt', colour: '#f59e0b', isIncome: false },
    { id: 'cat-health', name: 'Health', iconName: 'heart-pulse', colour: '#f87171', isIncome: false },
    { id: 'cat-online', name: 'Online Services', iconName: 'wifi', colour: '#a78bfa', isIncome: false },
    { id: 'cat-clothes', name: 'Clothes', iconName: 'shirt', colour: '#f472b6', isIncome: false },
    { id: 'cat-coffee', name: 'Coffee', iconName: 'coffee', colour: '#92400e', isIncome: false },
    { id: 'cat-travel', name: 'Travel', iconName: 'plane', colour: '#38bdf8', isIncome: false },
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
              previousRank: 3,
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
              previousRank: 2,
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

    if (path === '/finance/transaction-suggestions' && method === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(options.paymentSuggestions || []) })
    }

    if (/^\/finance\/transaction-suggestions\/[^/]+\/(accept|reject)$/.test(path) && method === 'POST') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) })
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
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(options.activeWorkout ? {
          id: 'session-active',
          title: 'Upper body',
          startAt: new Date(Date.now() - 12 * 60_000).toISOString(),
          sets: [{ id: 'set-existing', exerciseId: 'bench', weight: 80, reps: 8, order: 0 }],
        } : null),
      })
    }

    if (path === '/workout/exercises') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'bench', name: 'Bench press', muscleGroup: 'Chest' },
          { id: 'row', name: 'Cable row', muscleGroup: 'Back' },
        ]),
      })
    }

    if (path === '/workout/sets/session/session-active/add' && method === 'POST') {
      const body = route.request().postDataJSON()
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'set-new', order: 1, ...body }) })
    }

    if (path === '/workout/sets/set-new' && method === 'DELETE') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) })
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

    if (path === '/finance/budgets/status') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(options.budgetStatus || []) })
    }

    if (path === '/chat/conversations') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
    }

    if (path === '/spotify/linked') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ linked: true }) })
    }

    if (path === '/media/search') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(options.mediaSearchResults || []) })
    }

    if (path === '/media' && method === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}')
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'new-media-item', ...body }) })
    }

    if (path === '/media') {
      const items = options.mediaItems || [tvItem, animeItem]
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items,
          total: items.length,
        }),
      })
    }

    if (path === '/media/stats') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ total: 2, byStatus: { watching: 2 }, byType: { tv: 1, anime: 1 } }) })
    }

    if (path === '/media/catalog/summaries') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        [tvItem.id]: { ...tvCatalog(), seasons: [] },
        [animeItem.id]: { ...animeCatalog, relations: [], seasons: [] },
      }) })
    }

    if (path === '/media/media-tv/catalog') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(tvCatalog()) })
    }

    if (path === '/media/media-anime/catalog') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(animeCatalog) })
    }

    if (path === '/media/media-tv/episodes/episode-2' && route.request().method() === 'PATCH') {
      secondEpisodeWatched = JSON.parse(route.request().postData() || '{}').watched === true
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(tvCatalog()) })
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
    await expect(page.getByRole('heading', { name: /record needs you|all caught up/i })).toBeVisible()
    await expect(page.locator('.record-route-bar--native')).toContainText('Daily brief')
    await expect(page.getByText(/habits logged/i)).toBeVisible()
    await expect(page.getByText('Movement', { exact: true }).first()).toBeVisible()
    const primaryNavigation = page.getByRole('navigation', { name: 'Primary' })
    await expect(primaryNavigation.getByRole('link', { name: 'Today' })).toBeVisible()
    await expect(primaryNavigation.getByRole('link', { name: 'Records' })).toBeVisible()
    await expect(primaryNavigation.getByRole('button', { name: 'Capture' })).toBeVisible()
    await expect(primaryNavigation.getByRole('link', { name: 'Assistant' })).toBeVisible()
    await expect(primaryNavigation.getByRole('link', { name: 'You' })).toBeVisible()
    const captureButton = primaryNavigation.getByRole('button', { name: 'Capture' })
    await captureButton.click()
    const captureDialog = page.getByRole('dialog', { name: 'What happened?' })
    await expect(captureDialog).toBeVisible()
    await expect(captureDialog.getByRole('button', { name: 'Transaction' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(captureDialog).toBeHidden()
    await expect(captureButton).toBeFocused()
    await expect(page.locator('.native-app-switcher__item')).toHaveCount(0)
    await expect(page.locator('.record-route-bar--native')).toContainText('Today')
    await expect(page.getByRole('button', { name: 'New record' })).toBeVisible()
    await expect(page.locator('.native-tabbar__item')).toHaveCount(5)
    await expect(page.getByRole('link', { name: /download android app/i })).toHaveCount(0)
  })

  test('keeps route context in a compact header while records stay in global navigation', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/habits')

    const routeHeader = page.locator('.record-route-bar--native')
    await expect(routeHeader).toContainText('Habits')
    await expect(routeHeader).toContainText('Today')
    await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Records' })).toBeVisible()
    await expect(page.getByRole('button', { name: /open app menu/i })).toHaveCount(0)
  })

  test('logs and undoes a Gym set without leaving the active session', async ({ page }) => {
    await mockNativeApi(page, { activeWorkout: true })
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/workout/active')
    await expect(page.getByRole('heading', { name: 'Upper body' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bench press' })).toBeVisible()

    const weight = page.getByRole('spinbutton', { name: 'Weight kilograms' })
    const reps = page.getByRole('spinbutton', { name: 'Repetitions' })
    await expect(weight).toHaveValue('80')
    await expect(reps).toHaveValue('8')
    await weight.fill('82.5')
    await reps.fill('9')
    await page.getByRole('button', { name: 'Complete set' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Set saved' })).toBeVisible()
    await expect(page.locator('.gym-set-row--complete')).toHaveCount(2)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.locator('.gym-set-row--complete')).toHaveCount(1)
    await expect(weight).toHaveValue('82.5')
    await expect(reps).toHaveValue('9')
  })

  test('keeps global navigation stable while section navigation adapts', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance', { waitUntil: 'domcontentloaded' })

    const globalNavigation = page.getByRole('navigation', { name: 'Primary' })
    const sectionNavigation = page.getByRole('navigation', { name: 'Section navigation' })
    await expect(page.locator('.record-route-bar--native')).toContainText(/Cash[\s\S]*Ledger/)
    await expect(globalNavigation.locator('.native-tabbar__item')).toHaveText([
      /Today/,
      /Records/,
      /Capture/,
      /Assistant/,
      /You/,
    ])
    await expect(sectionNavigation.getByRole('link')).toHaveText([
      /Ledger/,
      /Budgets/,
      /Analysis/,
    ])
    await expect(sectionNavigation.getByRole('link', { name: 'Ledger' })).toHaveAttribute('aria-current', 'page')

    await page.goto('/finance/transactions', { waitUntil: 'domcontentloaded' })
    await expect(globalNavigation.locator('.native-tabbar__item')).toHaveCount(5)
    await expect(sectionNavigation.getByRole('link', { name: 'Ledger' })).toHaveAttribute('aria-current', 'page')

    await page.goto('/workout', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('.record-route-bar--native')).toContainText(/Gym[\s\S]*Training today/)
    await expect(sectionNavigation.getByRole('link')).toHaveText([
      /Today/,
      /Active/,
      /History/,
      /Exercises/,
      /Progress/,
    ])
    await expect(sectionNavigation.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page')

    await page.goto('/workout/history')
    await expect(sectionNavigation.getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page')

    await page.goto('/habits')

    await expect(page.locator('.record-route-bar--native')).toContainText(/Habits[\s\S]*Today/)
    await expect(sectionNavigation.getByRole('link')).toHaveText([
      /Today/,
      /Plan/,
      /History/,
      /Insights/,
    ])

    await page.goto('/media')
    await expect(page.locator('.record-route-bar--native')).toContainText(/Series[\s\S]*My list/)
    await expect(sectionNavigation.getByRole('link')).toHaveText([/My list/, /Discover/])
    await expect(sectionNavigation.getByRole('link', { name: 'My list' })).toHaveAttribute('aria-current', 'page')

    await page.goto('/chat')
    await expect(page.locator('.record-route-bar--native')).toContainText(/Assistant[\s\S]*Record analysis/)
    await expect(globalNavigation.locator('.native-tabbar__item')).toHaveCount(5)
    await expect(globalNavigation.getByRole('link', { name: 'Assistant' })).toHaveAttribute('aria-current', 'page')
  })

  test('keeps the native route title readable on narrow Android headers', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 412, height: 915 },
      { width: 486, height: 962 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/workout/history')
      const labelReport = await page.locator('.record-route-bar__context strong').evaluate((label) => ({
        text: label.textContent,
        clientWidth: label.clientWidth,
        scrollWidth: label.scrollWidth,
      }))
      expect(labelReport.text).toBe('History')
      expect(labelReport.scrollWidth).toBeLessThanOrEqual(labelReport.clientWidth + 1)
    }
  })

  test('renders season-aware TV progress and anime continuity', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/media')

    await expect(page.getByTestId('series-register')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Series' })).toBeVisible()
    await expect(page.locator('.stat-card')).toHaveCount(0)
    await expect(page.getByText('S01E01 · 1 of 2 watched')).toBeVisible()
    await expect(page.getByText('6 of 12 watched')).toBeVisible()

    await page.getByRole('button', { name: 'Open The Bear details' }).click()
    const televisionDetail = page.getByRole('dialog', { name: 'The Bear' })
    await expect(televisionDetail).toBeVisible()
    await expect(televisionDetail.getByRole('tab', { name: 'Season 1' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('S01E01 · System')).toBeVisible()
    await televisionDetail.getByRole('button', { name: 'Mark watched: S01E02 Hands' }).click()
    await expect(televisionDetail.getByText('S01E02 · 2 of 2 watched')).toBeVisible()
    await page.getByRole('button', { name: 'Close The Bear' }).click()

    await page.getByRole('button', { name: 'Open Blue Exorcist: Kyoto Saga details' }).click()
    await expect(page.getByRole('heading', { name: 'Series continuity' })).toBeVisible()
    await expect(page.getByText('Blue Exorcist', { exact: true })).toBeVisible()
    await expect(page.getByText('Blue Exorcist: Shimane Illuminati Saga')).toBeVisible()
    await expect(page.locator('.media-card')).toHaveCount(0)
    await expect(page.locator('.native-tabbar__item')).toHaveText(['Today', 'Records', 'Capture', 'Assistant', 'You'])

    await page.setViewportSize({ width: 320, height: 568 })
    const overflow = await getHorizontalOverflowReport(page)
    expect(overflow.documentScrollWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1)
    expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1)
  })

  test('redirects the native cash root to the month ledger', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance')

    await expect(page).toHaveURL(/\/finance\/transactions/)
    await expect(page.getByTestId('native-finance-transactions')).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Cash$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /add expense/i })).toBeVisible()
    await expect(page.getByText('Dinner')).toBeVisible()
    await expect(page.locator('table')).toHaveCount(0)
  })

  test('opens ledger transactions directly in the native editor', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance')
    await page.getByRole('button', { name: /dinner/i }).click()

    const sheet = page.getByTestId('native-transaction-form')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText(/^Edit Transaction$/i)).toBeVisible()
    await expect(sheet.locator('input[type="text"]').first()).toHaveValue('Dinner')
  })

  test('keeps active budgets in their dedicated cash register', async ({ page }) => {
    await mockNativeApi(page, {
      budgetStatus: [
        {
          id: 'budget-food',
          categoryName: 'Food',
          categoryIcon: 'utensils',
          categoryColour: '#4ade80',
          period: 'monthly',
          amount: 500,
          spent: 220,
          remaining: 280,
          percentage: 44,
          isOver: false,
        },
      ],
    })
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance/budgets')

    await expect(page.getByTestId('native-finance-budgets')).toBeVisible()
    const budgetCard = page.locator('.native-budget-ledger-card', { hasText: 'Food' })
    await expect(budgetCard).toBeVisible()
    await expect(budgetCard.getByText(/44%/)).toBeVisible()
  })

  test('uses a concise three-part cash section navigation', async ({ page }) => {
    await mockNativeApi(page, {
      budgetStatus: [
        {
          id: 'budget-food',
          categoryName: 'Food',
          categoryIcon: 'utensils',
          categoryColour: '#4ade80',
          period: 'monthly',
          amount: 500,
          spent: 220,
          remaining: 280,
          percentage: 44,
          isOver: false,
        },
      ],
    })
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance')

    await expect(page.getByTestId('native-finance-transactions')).toBeVisible()
    const links = page.getByRole('navigation', { name: 'Section navigation' }).getByRole('link')
    await expect(links).toHaveText(['Ledger', 'Budgets', 'Analysis'])
    await expect(links.filter({ hasText: 'Ledger' })).toHaveAttribute('aria-current', 'page')
  })

  test('shows native finance budgets as a first-class tab', async ({ page }) => {
    await mockNativeApi(page, {
      budgetStatus: [
        {
          id: 'budget-food',
          categoryName: 'Food',
          categoryIcon: 'utensils',
          categoryColour: '#4ade80',
          period: 'monthly',
          amount: 500,
          spent: 220,
          remaining: 280,
          percentage: 44,
          isOver: false,
        },
        {
          id: 'budget-events',
          categoryName: 'Events',
          categoryIcon: 'party-popper',
          categoryColour: '#f472b6',
          period: 'monthly',
          amount: 300,
          spent: 330,
          remaining: -30,
          percentage: 110,
          isOver: true,
        },
      ],
    })
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance/budgets')

    await expect(page.getByTestId('native-finance-budgets')).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Budgets$/i })).toBeVisible()
    await expect(page.getByText('Food')).toBeVisible()
    await expect(page.getByText(/280\.00 left/i)).toBeVisible()
    await expect(page.locator('.native-budget-ledger-card').first().getByText(/daily allowance/i)).toBeVisible()
    await expect(page.getByText('Events')).toBeVisible()

    await expect(
      page.getByRole('navigation', { name: 'Section navigation' }).getByRole('link', { name: 'Budgets' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('shows native finance trends from real transactions', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance/trends')

    await expect(page.getByTestId('native-finance-trends')).toBeVisible()
    await expect(page.getByTestId('native-finance-cashflow-chart')).toBeVisible()
    await expect(page.getByTestId('native-finance-category-mix')).toBeVisible()
    await expect(page.getByRole('heading', { name: /largest expense/i })).toBeVisible()
    await expect(page.locator('.native-largest-expense').getByText('Concert')).toBeVisible()

    await expect(
      page.getByRole('navigation', { name: 'Section navigation' }).getByRole('link', { name: 'Analysis' }),
    ).toHaveAttribute('aria-current', 'page')
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
    await expect(page.getByRole('button', { name: /show filters/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /filter wallet revolut/i })).toHaveCount(0)
    await page.getByRole('button', { name: /show filters/i }).click()
    await expect(page.getByRole('button', { name: /filter wallet revolut/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /filter category food/i })).toBeVisible()
    await expect(page.getByText('Concert')).toBeVisible()
    const concertRow = page.locator('.native-transaction-card', { hasText: 'Concert' })
    await expect(concertRow).toContainText('Events · Santander')
    await expect(concertRow).toContainText(/\u20ac55\.00/)
    await expect(page.locator('table')).toHaveCount(0)
  })

  test('reviews a detected payment before creating a ledger record', async ({ page }) => {
    await mockNativeApi(page, { paymentSuggestions: [{
      id: 'suggestion-1', eventHash: 'capture-hash', merchantRaw: 'MERCADONA', amount: 12.4,
      currency: 'EUR', occurredAt: '2026-07-13T10:00:00.000Z', confidence: 0.78,
      sourceAppLabel: 'Bank',
    }] })
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance/transactions?paymentSuggestionId=capture-hash')
    await expect(page.getByRole('dialog', { name: /make this record accurate/i })).toBeVisible()
    await expect(page.getByText(/notification text is not uploaded/i)).toBeVisible()
    await page.getByLabel('Wallet').selectOption('wallet-revolut')
    await page.getByLabel('Category').selectOption('cat-groceries')
    const requestPromise = page.waitForRequest(request => request.url().includes('/transaction-suggestions/suggestion-1/accept'))
    await page.getByRole('button', { name: /confirm payment/i }).click()
    const request = await requestPromise
    expect(request.postDataJSON()).toMatchObject({ name: 'MERCADONA', amount: 12.4, walletId: 'wallet-revolut', categoryId: 'cat-groceries' })
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('keeps the transaction add action aligned with the feed header when the feed is empty', async ({ page }) => {
    await mockNativeApi(page, { emptyTransactions: true })
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/finance/transactions')

    const feedCard = page.locator('.record-register', { hasText: 'Transactions' })
    await expect(feedCard.getByText(/no transactions match this view/i)).toBeVisible()
    await expect(page.locator('.native-finance-floating-add')).toHaveCount(0)
    await expect(feedCard.getByRole('button', { name: /add transaction/i })).toBeVisible()

    const alignment = await feedCard.evaluate((card) => {
      const cardBox = card.getBoundingClientRect()
      const addButton = card.querySelector('[aria-label="Add transaction"]')?.getBoundingClientRect()
      const emptyState = card.querySelector('.record-state')?.getBoundingClientRect()
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
    await expect(sheet.getByRole('searchbox', { name: /search categories/i })).toBeVisible()
    await expect(sheet.getByText(/^Choose$/i)).toBeVisible()
    await expect(sheet.getByRole('button', { name: /travel/i })).toBeVisible()
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
    await expect(caffeine.getByRole('button', { name: /^increase caffeine$/i })).toBeVisible()
    await caffeine.getByRole('button', { name: /^increase caffeine$/i }).click()
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

    await expect(page.getByRole('heading', { name: /^records$/i })).toBeVisible()
    const recordSearch = page.getByRole('searchbox', { name: /search app sections/i })
    await expect(recordSearch).toBeVisible()
    await expect(dailyActions.getByRole('link', { name: /^habits\b/i })).toBeVisible()
    await expect(dailyActions.getByRole('link', { name: /^gym\b/i })).toBeVisible()
    await expect(libraryAndInsights.getByRole('link', { name: /^cash\b/i })).toBeVisible()
    await expect(libraryAndInsights.getByRole('link', { name: /^spotify ranking\b/i })).toBeVisible()
    await expect(libraryAndInsights.getByRole('link', { name: /^series\b/i })).toBeVisible()
    await expect(imports.getByRole('link', { name: /^import habits\b/i })).toBeVisible()
    await expect(imports.getByRole('link', { name: /^cash settings\b/i })).toBeVisible()
    await expect(imports.getByRole('link', { name: /^import series\b/i })).toBeVisible()
    await expect(appControl.getByRole('link', { name: /^sync and offline\b/i })).toBeVisible()
    await expect(appControl.getByRole('link', { name: /^updates\b/i })).toBeVisible()

    await recordSearch.fill('updates')
    await expect(page.getByRole('link', { name: /^updates\b/i })).toBeVisible()
    await expect(page.locator('.native-menu-row')).toHaveCount(1)
  })

  test('shows listening rank movement on a shared Spotify timeframe', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/spotify/ranking')

    await expect(page.getByRole('heading', { name: 'Listening ranking' })).toBeVisible()
    const firstListener = page.locator('.native-ranking-row').filter({ hasText: 'Arianna Caballero' })
    await expect(firstListener).toContainText('Up 2')
    await page.getByRole('button', { name: 'Month', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('shows native settings sections for notifications sync and updates', async ({ page }) => {
    await mockNativeApi(page)
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: /^you$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /notifications/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sync and offline/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^updates/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^privacy/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^developer access/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^data/i })).toBeVisible()
    await expect(page.locator('.tab-btn')).toHaveCount(0)

    await page.getByRole('button', { name: /^data/i }).click()
    await expect(page.getByRole('link', { name: /import habits/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /cash settings/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /import gym records/i })).toBeVisible()
  })

  test('opens a searchable media discovery page and adds a catalog result', async ({ page }) => {
    await mockNativeApi(page, {
      mediaSearchResults: [{
        title: 'Frieren: Beyond Journey\'s End',
        type: 'anime',
        coverUrl: 'https://example.test/frieren.jpg',
        year: 2023,
        description: 'An elf mage retraces the journey she once shared with her companions.',
        externalIds: { malId: 52991 },
        metadata: { episodes: 28, genres: ['Adventure', 'Fantasy'] },
      }],
    })
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/media')
    await page.getByRole('navigation', { name: 'Section navigation' }).getByRole('link', { name: 'Discover' }).click()

    await expect(page).toHaveURL(/\/media\?view=discover/)
    await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible()
    const search = page.getByRole('searchbox', { name: 'Search the media catalog' })
    await search.fill('Frieren')
    await page.getByRole('button', { name: 'Search catalog' }).click()

    const result = page.getByRole('article', { name: /Frieren: Beyond Journey's End/ })
    await expect(result).toContainText('2023')
    await expect(result).toContainText('28 episodes')
    await result.getByRole('button', { name: 'Add to my list' }).click()
    await expect(result.getByRole('button', { name: 'In my list' })).toBeDisabled()
  })

  test('paginates the native media library without horizontal overflow', async ({ page }) => {
    const mediaItems = Array.from({ length: 30 }, (_, index) => ({
      id: `paged-${index + 1}`,
      title: `Paged title ${String(index + 1).padStart(2, '0')}`,
      type: 'anime',
      status: 'planning',
      coverUrl: '',
      metadata: { episodes: 12, episodesWatched: 0 },
      externalIds: { malId: 1000 + index },
    }))
    await mockNativeApi(page, { mediaItems })
    await page.addInitScript(() => {
      ;(window as any).Capacitor = { isNativePlatform: () => true }
      localStorage.setItem('accessToken', 'native-access')
      localStorage.setItem('refreshToken', 'native-refresh')
    })

    await page.goto('/media')

    await expect(page.locator('.series-row')).toHaveCount(24)
    await expect(page.getByText('Paged title 01')).toBeVisible()
    await expect(page.getByText('Paged title 25')).toHaveCount(0)
    await expect(page.getByText('1–24 of 30 titles').first()).toBeVisible()

    await page.getByLabel('Media page').first().selectOption('2')
    await expect(page.locator('.series-row')).toHaveCount(6)
    await expect(page.getByText('Paged title 25')).toBeVisible()
    await expect(page.getByText('Paged title 01')).toHaveCount(0)

    await page.setViewportSize({ width: 320, height: 568 })
    const overflow = await getHorizontalOverflowReport(page)
    expect(overflow.documentScrollWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1)
    expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1)
  })

  test('signs out from the native account screen and clears the device session', async ({ page }) => {
    await enableNativeSession(page)
    await page.goto('/settings?section=account')

    const signOut = page.getByRole('button', { name: /^sign out$/i })
    await expect(signOut).toBeVisible()
    await expect(signOut).toHaveCSS('min-height', '44px')
    await signOut.click()

    await expect(page).toHaveURL(/\/login$/)
    const tokens = await page.evaluate(() => ({
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    }))
    expect(tokens).toEqual({ accessToken: null, refreshToken: null })
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

    await expect(page.getByRole('button', { name: /appearance/i })).toBeVisible()
    await page.getByRole('button', { name: /appearance/i }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Appearance', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Home-screen widgets', exact: true })).toBeVisible()
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

    await expect(page.getByRole('heading', { name: /^training$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /start workout/i }).first()).toBeVisible()
    await expect(page.getByText('No records yet', { exact: true })).toBeVisible()
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
    await expect(page.getByLabel('Authentication mode').getByRole('link', { name: /^register$/i })).toBeVisible()
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
      await expect(page.getByLabel('Authentication mode').getByRole('link', { name: /^register$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()

      await page.goto('/register')
      await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible()
      await expect(page.getByLabel('Authentication mode').getByRole('link', { name: /^login$/i })).toBeVisible()
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
      '/finance/budgets',
      '/finance/trends',
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
          report.scrollable.every((item) => /domain-nav|record-segmented|series-season-tabs|chat-state-row|record-settings-nav/.test(item.selector)),
          `${route} at ${viewport.width}px should only allow intentional section-tab scrolling`,
        ).toBe(true)
        expect(report.documentScrollWidth).toBeLessThanOrEqual(report.viewportWidth + 1)
        expect(report.bodyScrollWidth).toBeLessThanOrEqual(report.viewportWidth + 1)
      }
    }
  })
})
