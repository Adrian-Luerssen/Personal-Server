import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5194'
const outDir = process.env.AUDIT_OUT_DIR || path.resolve('output/pdf/ux-audit-assets')

const today = '2026-07-01'
const monthKey = '2026-07'

const wallets = [
  { id: 'wallet-revolut', name: 'Revolut', balance: 754.86, currency: 'EUR', iconName: 'wallet', colour: '0xff26c6da' },
  { id: 'wallet-bankinter', name: 'Bankinter', balance: 44823.32, currency: 'EUR', iconName: 'account_balance_wallet', colour: '0xffff7043' },
  { id: 'wallet-bbva', name: 'BBVA', balance: 4.64, currency: 'EUR', iconName: 'account_balance', colour: '#60a5fa' },
]

const categories = [
  { id: 'cat-accommodation', name: 'Accommodation', iconName: 'home2.png', colour: '0xff9e9e9e', isIncome: false },
  { id: 'cat-health', name: 'Health', iconName: 'healthcare-and-medical.png', colour: '0xffef5350', isIncome: false },
  { id: 'cat-online', name: 'Online Services', iconName: 'wifi', colour: '#a78bfa', isIncome: false },
  { id: 'cat-events', name: 'Events', iconName: 'events.png', colour: '0xff26a69a', isIncome: false },
  { id: 'cat-dining', name: 'Dining', iconName: 'cutlery.png', colour: '0xffffca28', isIncome: false },
  { id: 'cat-travel', name: 'Travel', iconName: 'plane.png', colour: '0xffffa000', isIncome: false },
  { id: 'cat-salary', name: 'Salary', iconName: 'briefcase', colour: '#22c55e', isIncome: true },
  { id: 'cat-transfer', name: 'Transfer', iconName: 'sync_alt', colour: '#7dd3fc', isIncome: false },
]

const transactions = [
  tx('tx-1', 'Revolut Ultra', -55, '2026-06-29', wallets[0], categories[2]),
  tx('tx-2', 'Spotify Premium', -6.49, '2026-06-26', wallets[1], categories[2]),
  tx('tx-3', 'Alojamiento', -123.32, '2026-06-25', wallets[0], categories[0]),
  tx('tx-4', 'Psicologo', -70, '2026-06-25', wallets[0], categories[1]),
  tx('tx-5', 'Bankinter Transfer In', 500, '2026-06-25', wallets[1], categories[6]),
  tx('tx-6', 'Night out', -86.40, '2026-06-22', wallets[0], categories[3]),
  tx('tx-7', 'Dinner', -42.30, '2026-06-21', wallets[0], categories[4]),
]

function tx(id, name, amount, transactionDate, wallet, category) {
  return {
    id,
    name,
    amount: Math.abs(amount),
    isIncome: amount > 0,
    transactionDate,
    wallet,
    walletId: wallet.id,
    category,
    categoryId: category.id,
  }
}

const habits = [
  { id: 'sleep', name: 'Sleep', iconName: 'moon', color: '#60a5fa', trackingType: 'boolean', frequencyType: 'daily', frequencyTarget: 1, isActive: true },
  { id: 'gym', name: 'Gym', iconName: 'dumbbell', color: '#4ade80', trackingType: 'boolean', frequencyType: 'weekly', frequencyTarget: 4, isActive: true },
  { id: 'caffeine', name: 'Caffeine', iconName: 'coffee', color: '#fbbf24', trackingType: 'numeric', frequencyType: 'daily', frequencyTarget: 1, numericUnit: 'cups', numericPassThreshold: 1, numericSkipThreshold: 2, isActive: true },
  { id: 'smoking', name: 'No Smoking', iconName: 'cigarette-off', color: '#a78bfa', trackingType: 'boolean', frequencyType: 'daily', frequencyTarget: 1, isActive: true },
]

const mediaItems = [
  {
    id: 'media-1',
    title: 'Blue Exorcist',
    type: 'anime',
    status: 'paused',
    rating: 7,
    coverUrl: '',
    imageUrl: '',
    metadata: {
      episodesWatched: 37,
      episodes: 73,
      synopsis: 'Humans and demons are two sides of the same coin. This imported aggregate hides the separate seasons.',
      genres: ['Action', 'Supernatural'],
      tags: ['anime', 'action'],
    },
  },
  {
    id: 'media-2',
    title: 'Unforgettable',
    type: 'tv',
    status: 'watching',
    rating: 6,
    imageUrl: '',
    metadata: { episodesWatched: 8, episodes: 61, tags: ['tv'] },
  },
]

const mediaSearchResults = [
  {
    title: 'Blue Exorcist: Kyoto Saga',
    type: 'anime',
    year: 2017,
    coverUrl: '',
    description: 'Second season of Blue Exorcist.',
    metadata: { episodes: 12, mediaFormat: 'TV', genres: ['Action', 'Supernatural'] },
    externalIds: { mal: '33506' },
  },
  {
    title: 'Blue Exorcist: Shimane Illuminati Saga',
    type: 'anime',
    year: 2024,
    coverUrl: '',
    description: 'Later Blue Exorcist season.',
    metadata: { episodes: 12, mediaFormat: 'TV', genres: ['Action'] },
    externalIds: { mal: '53889' },
  },
]

const workoutCategories = [
  { id: 'wc-1', name: 'Strength', color: '#4ade80', description: 'Loaded movements' },
  { id: 'wc-2', name: 'Cardio', color: '#7dd3fc', description: 'Conditioning and endurance' },
]

const workoutExercises = [
  { id: 'ex-1', name: 'Bench Press', muscleGroup: 'Chest', categoryId: 'wc-1', category: workoutCategories[0] },
  { id: 'ex-2', name: 'Squat', muscleGroup: 'Legs', categoryId: 'wc-1', category: workoutCategories[0] },
  { id: 'ex-3', name: 'Run', muscleGroup: 'Full body', categoryId: 'wc-2', category: workoutCategories[1] },
]

const activeWorkoutSession = {
  id: 'session-active',
  title: 'Active Session',
  startAt: '2026-07-01T08:00:00.000Z',
  sets: [
    { id: 'set-1', exerciseId: 'ex-1', exercise: workoutExercises[0], reps: 8, weight: 80, order: 1 },
    { id: 'set-2', exerciseId: 'ex-1', exercise: workoutExercises[0], reps: 6, weight: 85, order: 2 },
  ],
}

const workoutHistory = [
  {
    id: 'session-1',
    title: 'Upper body',
    startAt: '2026-06-30T09:00:00.000Z',
    endAt: '2026-06-30T10:05:00.000Z',
    date: '2026-06-30',
    notes: 'Bench focus.',
    sets: activeWorkoutSession.sets,
  },
]

const subscriptions = [
  {
    id: 'sub-1',
    name: 'Spotify Premium',
    amount: 6.49,
    frequency: 'monthly',
    billingDay: 26,
    walletId: wallets[1].id,
    wallet: wallets[1],
    categoryId: categories[2].id,
    category: categories[2],
    isIncome: false,
    isActive: true,
  },
]

const budgets = [
  { id: 'budget-1', name: 'Spending Limit', categoryName: 'Spending Limit', spent: 280.22, amount: 300, limit: 300, remaining: 19.78, percentage: 93, color: '#ff7043', period: 'monthly', isOver: false },
  { id: 'budget-2', name: 'Night Out', categoryName: 'Night Out', spent: 56.55, amount: 100, limit: 100, remaining: 43.45, percentage: 57, color: '#2563eb', period: 'monthly', isOver: false },
  { id: 'budget-3', name: 'Savings', categoryName: 'Savings', spent: 1178.06, amount: 1200, limit: 1200, remaining: 21.94, percentage: 98, color: '#66bb6a', period: 'monthly', isOver: false },
]

const agentKeys = [
  {
    id: 'agent-key-1',
    name: 'Local assistant worker',
    keyPrefix: 'ps_live_1234',
    scopes: ['chat:read', 'chat:write', 'dashboard:read', 'finance:read'],
    isActive: true,
    createdAt: '2026-06-30T08:00:00.000Z',
    lastUsedAt: '2026-07-01T07:30:00.000Z',
    expiresAt: null,
  },
]

const apiJson = (body) => ({ contentType: 'application/json', body: JSON.stringify(body) })

async function mockApis(page) {
  await page.route('https://api.github.com/repos/Adrian-Luerssen/Personal-Server/releases/latest', async (route) => {
    await route.fulfill(apiJson({
      tag_name: 'android-v0.0.1',
      name: 'Personal Server Android v0.0.1',
      published_at: '2026-06-30T09:00:00.000Z',
      body: 'Installed audit build.',
      assets: [{ name: 'personal-server.apk', browser_download_url: 'https://example.com/personal-server.apk' }],
    }))
  })

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const pathName = url.pathname.replace(/^\/api/, '')
    const method = route.request().method()

    if (pathName === '/auth/refresh') return route.fulfill(apiJson({ accessToken: 'audit-access', refreshToken: 'audit-refresh' }))
    if (pathName === '/sync/watermarks') return route.fulfill(apiJson({ watermarks: { finance: '2026-07-01T08:00:00Z', habits: '2026-07-01T08:00:00Z' } }))
    if (pathName === '/app/versions/status') return route.fulfill(apiJson({
      installedVersion: '0.0.1.20',
      updateAvailable: false,
      updateRequired: false,
      latest: { version: '0.0.1.20', changelog: { features: ['Native finance tabs', 'Icon fixes', 'Widget settings'] } },
    }))
    if (pathName === '/dashboard/mobile') return route.fulfill(apiJson({
      generatedAt: '2026-07-01T08:00:00.000Z',
      sync: { checkedAt: '2026-07-01T08:00:00.000Z', watermarks: {} },
      intelligence: {
        focus: 'steady',
        score: 64,
        headline: 'Today is under control',
        summary: 'Cached local snapshot refreshed this morning.',
        insights: [{ id: 'i-1', title: 'Training supports consistency', summary: 'Habit completion is stronger on workout days.', tone: 'positive', domains: ['workout', 'habits'] }],
        aiPrompts: [{ id: 'p-1', label: 'Review today', prompt: 'Review today.', pageContext: { route: '/home' } }],
      },
      spotify: { stats: { totalStreams: 310, uniqueArtists: 42 } },
      workout: { totals: { totalWorkouts: 3, totalVolume: 12000, totalSets: 42, totalReps: 320 }, recentSessions: [{ name: 'Upper body', date: '2026-06-30T09:00:00Z' }] },
      habits: { today: habits.map((habit, index) => ({ habitId: habit.id, habitName: habit.name, todayStatus: index < 2 ? 'success' : 'none', completedToday: index < 2, longestStreak: 8 })), dailyCompletions: [] },
      finance: { monthlySpent: 1383.45, summary: { totalExpense: -1383.45 } },
      weeklySummary: { workouts: 3, habitsCompleted: 14, habitsTotal: 20, spending: 1383.45, streams: 310 },
      workoutHabitCorrelation: { workoutDays: { completionRate: 84 }, restDays: { completionRate: 62 }, totalWorkoutDays: 3 },
    }))
    if (pathName === '/dashboard/intelligence') return route.fulfill(apiJson({
      focus: 'steady',
      score: 64,
      headline: 'Today is under control',
      summary: 'Cached local snapshot refreshed this morning.',
      snapshot: [
        { id: 'training', label: 'Training', value: '3', note: 'sessions this week' },
        { id: 'habits', label: 'Habits', value: '70%', note: 'completion today' },
        { id: 'spending', label: 'Spend', value: 'EUR 1.3k', note: 'this month' },
        { id: 'media', label: 'Music', value: '310', note: 'streams today' },
      ],
      insights: [{ id: 'i-1', title: 'Training supports consistency', summary: 'Habit completion is stronger on workout days.', tone: 'positive', domains: ['workout', 'habits'] }],
      aiPrompts: [{ id: 'p-1', label: 'Review today', prompt: 'Review today.', pageContext: { route: '/home' } }],
    }))
    if (pathName === '/dashboard/insights/weekly') return route.fulfill(apiJson({ workouts: 3, habitsCompleted: 14, habitsTotal: 20, spending: 1383.45, streams: 310 }))
    if (pathName === '/dashboard/insights/workout-habits') return route.fulfill(apiJson({ workoutDays: { completionRate: 84 }, restDays: { completionRate: 62 }, totalWorkoutDays: 3 }))

    if (pathName === '/habits' && method === 'GET') return route.fulfill(apiJson(habits))
    if (pathName === '/habits/summary') return route.fulfill(apiJson(habits.map((habit, index) => ({ id: habit.id, name: habit.name, completedToday: false, todayStatus: 'none', selectedStatus: 'none', currentStreak: index === 1 ? 2 : 0, negativeStreak: index === 3 ? 3 : 0, longestStreak: 8, successRate: 70 + index * 5 }))))
    if (pathName === `/habits/calendar/${monthKey}`) return route.fulfill(apiJson({ habits: Object.fromEntries(habits.map((habit) => [habit.id, habit])), entries: [] }))
    if (pathName === `/habits/progress/${monthKey}`) return route.fulfill(apiJson({ weekly: {}, monthly: [], yearly: [] }))
    if (pathName === '/habits/trends') return route.fulfill(apiJson({}))
    if (/^\/habits\/[^/]+\/entries/.test(pathName)) return route.fulfill(apiJson({ ok: true }))

    if (pathName === '/workout/sessions') return route.fulfill(apiJson({
      sessions: workoutHistory,
      totalWorkouts: 3,
      totalVolume: 12000,
      totalSets: 42,
      totalReps: 320,
      totalTimeSeconds: 7200,
    }))
    if (pathName === '/dashboard/streams/workout') return route.fulfill(apiJson({ streams: 41, totalTimeSeconds: 3600 }))
    if (pathName === '/workout/sessions/active') return route.fulfill(apiJson(activeWorkoutSession))
    if (pathName === '/workout/sessions/recent') return route.fulfill(apiJson([{ id: 'w-1', name: 'Upper body', date: '2026-06-30T09:00:00Z', startAt: '2026-06-30T09:00:00Z' }]))
    if (pathName === '/workout/sessions/prs') return route.fulfill(apiJson([]))
    if (/^\/workout\/sessions\/[^/]+\/prs$/.test(pathName)) return route.fulfill(apiJson([]))
    if (pathName === '/workout/bodyweight') return route.fulfill(apiJson([{ id: 'bw-1', date: '2026-06-29', weightKg: 78.4, note: 'Morning' }]))
    if (pathName === '/workout/exercises') return route.fulfill(apiJson(workoutExercises))
    if (/^\/workout\/exercises\/history\//.test(pathName)) return route.fulfill(apiJson([{ reps: 8, weight: 80, createdAt: '2026-06-30T09:00:00Z' }]))
    if (pathName === '/workout/categories') return route.fulfill(apiJson(workoutCategories))
    if (pathName === '/workout/sessions/start') return route.fulfill(apiJson(activeWorkoutSession))
    if (/^\/workout\/sets\/session\/[^/]+\/add$/.test(pathName)) return route.fulfill(apiJson({ id: 'set-new', exerciseId: 'ex-1', exercise: workoutExercises[0], reps: 8, weight: 80, order: 3 }))

    if (pathName === '/finance/wallets') return route.fulfill(apiJson(wallets))
    if (pathName === '/finance/categories') return route.fulfill(apiJson(categories))
    if (pathName === '/finance/transactions/summary') return route.fulfill(apiJson({
      totalIncome: 2488.76,
      totalExpense: -1305.31,
      totalExpenses: -1305.31,
      topExpenseCategories: categories.filter((category) => !category.isIncome).slice(0, 5).map((category, index) => ({
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.iconName,
        categoryColour: category.colour,
        total: [-500, -281.43, -279.49, -266.29, -141.26][index] || -50,
      })),
    }))
    if (pathName === '/finance/transactions' && method === 'GET') return route.fulfill(apiJson({ items: transactions, total: transactions.length }))
    if (pathName === '/finance/transactions' && method === 'POST') return route.fulfill(apiJson({ id: 'tx-new' }))
    if (pathName === '/finance/transactions/transfer') return route.fulfill(apiJson({ id: 'tx-transfer' }))
    if (pathName === '/finance/budgets/status') return route.fulfill(apiJson(budgets))
    if (pathName === '/finance/budgets') return route.fulfill(apiJson(budgets))
    if (/^\/finance\/budgets\//.test(pathName)) return route.fulfill(apiJson({ ok: true }))
    if (pathName === '/finance/subscriptions') return route.fulfill(apiJson(subscriptions))
    if (/^\/finance\/subscriptions/.test(pathName)) return route.fulfill(apiJson({ id: 'sub-new', ...subscriptions[0] }))
    if (/^\/finance\/wallets\//.test(pathName)) return route.fulfill(apiJson({ ok: true }))
    if (/^\/finance\/categories\//.test(pathName)) return route.fulfill(apiJson({ ok: true }))
    if (pathName === '/finance/transaction-suggestions') return route.fulfill(apiJson([
      { id: 'suggestion-1', merchant: 'Revolut', amount: 70, currency: 'EUR', detectedAt: '2026-07-01T08:05:00Z', sourceApp: 'Revolut' },
    ]))
    if (/^\/finance\/transaction-suggestions\/[^/]+\/(accept|reject)$/.test(pathName)) return route.fulfill(apiJson({ ok: true }))

    if (pathName === '/streams/stats') return route.fulfill(apiJson({ totalStreams: 310, uniqueArtists: 42 }))
    if (pathName === '/streams/global-stats') return route.fulfill(apiJson({ totalStreams: 7900, uniqueTracks: 1200, uniqueArtists: 410, msListened: 71000000 }))
    if (pathName === '/streams/global-top') return route.fulfill(apiJson([{ trackId: 'track-1', count: 180, trackName: 'Already Do' }]))
    if (pathName === '/albums/global-top-albums') return route.fulfill(apiJson([{ albumId: 'album-1', count: 120, albumName: 'Jaime' }]))
    if (pathName === '/artists/global-top-artists') return route.fulfill(apiJson([{ artistId: 'artist-1', count: 220, artistName: 'Brittany Howard' }]))
    if (pathName === '/spotify/me') return route.fulfill(apiJson({ displayName: 'Adrian', email: 'adrian@example.com', spotifyUserId: 'audit-user', streamTrackingEnabled: true, images: [] }))
    if (pathName === '/spotify/currently-playing') return route.fulfill(apiJson(null))
    if (pathName === '/streams/history') return route.fulfill(apiJson({ items: [{ id: 'stream-1', trackName: 'Already Do', artistName: 'Brittany Howard', playedAt: '2026-07-01T08:00:00Z' }] }))
    if (pathName === '/streams/per-day') return route.fulfill(apiJson([{ date: '2026-06-29', count: 80 }, { date: '2026-06-30', count: 110 }, { date: '2026-07-01', count: 310 }]))
    if (pathName === '/streams/per-hour') return route.fulfill(apiJson([{ hour: 8, count: 12 }, { hour: 12, count: 35 }, { hour: 18, count: 48 }]))
    if (pathName === '/streams/mood') return route.fulfill(apiJson({ averages: { energy: 0.62, danceability: 0.58, valence: 0.47, acousticness: 0.2, instrumentalness: 0.04, speechiness: 0.08, bpm: 124 }, distribution: { energy: { low: 10, medium: 55, high: 35 }, mood: { sad: 20, neutral: 45, happy: 35 } }, totalTracks: 140 }))
    if (pathName === '/streams/top') return route.fulfill(apiJson([{ trackId: 'track-1', count: 18, trackName: 'Already Do' }]))
    if (pathName === '/albums/top-albums') return route.fulfill(apiJson([{ albumId: 'album-1', count: 12, albumName: 'Jaime' }]))
    if (pathName === '/artists/top-artists') return route.fulfill(apiJson([{ artistId: 'artist-1', count: 22, artistName: 'Brittany Howard' }]))
    if (pathName === '/playlists/top-playlists') return route.fulfill(apiJson([{ playlistId: 'playlist-1', count: 8, playlistName: 'Daily' }]))
    if (/^\/tracks\//.test(pathName)) return route.fulfill(apiJson({ name: 'Already Do', artists: ['Brittany Howard'] }))
    if (/^\/albums\//.test(pathName)) return route.fulfill(apiJson({ name: 'Jaime', artists: ['Brittany Howard'] }))
    if (/^\/artists\//.test(pathName)) return route.fulfill(apiJson({ name: 'Brittany Howard' }))
    if (/^\/playlists\//.test(pathName)) return route.fulfill(apiJson({ name: 'Daily' }))
    if (pathName === '/streams/user-ranking') return route.fulfill(apiJson({
      timeframe: url.searchParams.get('timeframe') || 'week',
      items: [
        { accountId: 'spotify-1', rank: 1, displayName: 'Arianna Caballero', spotifyUserId: '11145917586', streamCount: 4590, uniqueTracks: 280, msListened: 98280000, lastStream: '2026-07-01T07:00:00Z', profileImageUrl: 'https://example.com/avatar.jpg' },
        { accountId: 'spotify-2', rank: 2, displayName: 'Pau Coderch', spotifyUserId: 'rukiirukii90', streamCount: 3310, uniqueTracks: 198, msListened: 71100000, lastStream: '2026-06-30T19:00:00Z' },
      ],
    }))
    if (pathName === '/spotify/linked') return route.fulfill(apiJson({ linked: true }))

    if (pathName === '/media') return route.fulfill(apiJson({ items: mediaItems, total: mediaItems.length }))
    if (pathName === '/media/stats') return route.fulfill(apiJson({
      total: mediaItems.length,
      inProgress: 1,
      completed: 1,
      averageRating: 6.5,
      byStatus: {},
      byType: { anime: 1, manga: 0, tv: 1, movie: 0, book: 0 },
      byTag: { anime: 1, manga: 0, tv: 1, movie: 0, book: 0 },
    }))
    if (pathName === '/media/search') return route.fulfill(apiJson(mediaSearchResults))
    if (/^\/media\/[^/]+\/match$/.test(pathName)) return route.fulfill(apiJson({ ok: true }))
    if (/^\/media\/[^/]+$/.test(pathName)) return route.fulfill(apiJson({ ok: true }))

    if (pathName === '/accounts') return route.fulfill(apiJson({ email: 'adrian@example.com', displayName: 'Adrian', mfaEnabled: false }))
    if (pathName === '/auth/mfa/status') return route.fulfill(apiJson({ enabled: false }))
    if (pathName === '/auth/mfa/setup') return route.fulfill(apiJson({ secret: 'AUDITSECRET', qrCode: '' }))
    if (pathName === '/auth/mfa/enable' || pathName === '/auth/mfa/disable') return route.fulfill(apiJson({ enabled: pathName.endsWith('enable') }))
    if (pathName === '/auth/spotify/link') return route.fulfill(apiJson({ url: 'https://accounts.spotify.com/authorize?audit=true' }))
    if (pathName === '/spotify/tokens') return route.fulfill(apiJson({ ok: true }))
    if (pathName === '/spotify/sync-streams' || pathName === '/spotify/stream-tracking') return route.fulfill(apiJson({ ok: true }))
    if (pathName === '/agents/keys') {
      if (method === 'GET') return route.fulfill(apiJson({ keys: agentKeys }))
      if (method === 'POST') return route.fulfill(apiJson({ key: 'ps_live_created_audit_key', agentKey: { ...agentKeys[0], id: 'agent-key-created', name: 'Audit key' } }))
    }
    if (/^\/agents\/keys\/[^/]+\/toggle$/.test(pathName)) return route.fulfill(apiJson({ ok: true }))
    if (/^\/agents\/keys\/[^/]+$/.test(pathName)) return route.fulfill(apiJson({ ok: true }))
    if (/^\/data\/(workout|finance|habits|music|chat)$/.test(pathName)) return route.fulfill(apiJson({ ok: true }))

    if (pathName === '/chat/conversations') return route.fulfill(apiJson([
      { id: 'c-1', title: 'Review my week', updatedAt: '2026-07-01T08:00:00Z', messageCount: 0 },
      { id: 'c-2', title: 'What data do you have of mine?', updatedAt: '2026-06-30T08:00:00Z', messageCount: 0 },
    ]))

    await route.fulfill(apiJson({}))
  })
}

function safeFileName(label) {
  return label.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
}

function makeFindings(route, metrics) {
  const findings = []
  if (metrics.crashed) {
    findings.push({ severity: 'critical', area: 'Reliability', issue: 'Route appears blank or crashed', recommendation: 'Add route-level error boundary and API response guards.' })
  }
  if (metrics.overflow.document || metrics.overflow.local.length) {
    findings.push({ severity: 'critical', area: 'Responsive layout', issue: `Horizontal overflow detected (${metrics.overflow.local.length} local containers)`, recommendation: 'Remove fixed-width content or convert tables/chips to wrapped native rows.' })
  }
  if (metrics.activeTabCount > 1) {
    findings.push({ severity: 'high', area: 'Navigation', issue: `${metrics.activeTabCount} bottom navigation items are highlighted`, recommendation: 'Ensure only the current route tab receives the active class.' })
  }
  if (metrics.smallTargets.length > 0) {
    findings.push({ severity: metrics.smallTargets.length > 5 ? 'high' : 'medium', area: 'Touch ergonomics', issue: `${metrics.smallTargets.length} visible interactive targets below 44px`, recommendation: 'Raise tap boxes to 44px or consolidate dense controls into sheets/menus.' })
  }
  if (metrics.unnamedControls.length > 0) {
    findings.push({ severity: 'high', area: 'Accessibility', issue: `${metrics.unnamedControls.length} visible controls have no accessible name`, recommendation: 'Add text, aria-label, or associated labels to every button/link/input.' })
  }
  if (metrics.lowContrast.length > 0) {
    findings.push({ severity: metrics.lowContrast.length > 8 ? 'high' : 'medium', area: 'Visual accessibility', issue: `${metrics.lowContrast.length} sampled text elements appear below 4.5:1 contrast`, recommendation: 'Increase text opacity or darken surfaces for metadata and disabled-looking labels.' })
  }
  if (metrics.largeEmptyBlocks.length > 0) {
    findings.push({ severity: 'medium', area: 'Information density', issue: `${metrics.largeEmptyBlocks.length} large low-content blocks found`, recommendation: 'Reduce fixed heights and replace empty boxes with compact next-action states.' })
  }
  if (metrics.bottomOverlapRisk) {
    findings.push({ severity: 'high', area: 'Gesture/navigation safety', issue: 'Last content risks being hidden behind the bottom tabbar', recommendation: 'Increase safe-area padding and verify bottom-of-scroll clearance.' })
  }
  if (route.group === 'Finance' && route.path.includes('transactions') && metrics.text.includes('Wallet') && metrics.text.includes('Category') && metrics.smallTargets.length > 8) {
    findings.push({ severity: 'medium', area: 'Finance control model', issue: 'Finance filters expose many chips inline at once', recommendation: 'Use a Cashew-style compact filter sheet with selected wallet/category summaries.' })
  }
  if (route.group === 'Assistant' && !/connected|reconnecting|offline|agent|socket/i.test(metrics.text)) {
    findings.push({ severity: 'high', area: 'Assistant state', issue: 'No visible socket or agent availability state', recommendation: 'Show connection, queued message, thinking, failed, and delivered states.' })
  }
  if (route.group === 'Media' && /37\s*\/\s*73|episodes watched/i.test(metrics.text)) {
    findings.push({ severity: 'high', area: 'Media model', issue: 'Flat aggregate episode progress hides season/franchise structure', recommendation: 'Split anime seasons into works grouped by franchise and expose source-match confidence.' })
  }
  if (route.group === 'Settings' && route.path.includes('integrations') && !/today|7 days|background/i.test(metrics.text)) {
    findings.push({ severity: 'medium', area: 'Health data', issue: 'Step sync status does not surface enough historical context', recommendation: 'Show where daily step counts are stored and when they last synced.' })
  }
  return findings
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const box = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0
    }
    const selectorFor = (element) => {
      if (element.id) return `#${element.id}`
      const testId = element.getAttribute('data-testid')
      if (testId) return `[data-testid="${testId}"]`
      const cls = [...element.classList].slice(0, 3).map((name) => `.${name}`).join('')
      return `${element.tagName.toLowerCase()}${cls}`
    }
    const accessibleName = (element) => {
      return (
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.getAttribute('alt') ||
        element.textContent ||
        ''
      ).trim()
    }
    const interactive = [...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[tabindex]:not([tabindex="-1"])')].filter(visible)
    const smallTargets = interactive
      .map((element) => {
        const box = element.getBoundingClientRect()
        return { selector: selectorFor(element), name: accessibleName(element).slice(0, 80), width: Math.round(box.width), height: Math.round(box.height) }
      })
      .filter((item) => item.width < 44 || item.height < 44)
    const unnamedControls = interactive
      .filter((element) => !accessibleName(element))
      .map((element) => selectorFor(element))
    const localOverflow = [...document.querySelectorAll('body *')]
      .filter(visible)
      .map((element) => {
        const style = getComputedStyle(element)
        return { selector: selectorFor(element), overflowX: style.overflowX, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }
      })
      .filter((item) => ['auto', 'scroll'].includes(item.overflowX) && item.scrollWidth > item.clientWidth + 1)
    const largeEmptyBlocks = [...document.querySelectorAll('section,article,div')]
      .filter(visible)
      .map((element) => {
        const box = element.getBoundingClientRect()
        const text = (element.textContent || '').trim().replace(/\s+/g, ' ')
        return { selector: selectorFor(element), width: Math.round(box.width), height: Math.round(box.height), textLength: text.length, text: text.slice(0, 80) }
      })
      .filter((item) => item.height > 260 && item.textLength < 90)
      .slice(0, 8)

    function parseRgb(value) {
      const match = value.match(/rgba?\(([^)]+)\)/)
      if (!match) return null
      const [r, g, b, a = '1'] = match[1].split(',').map((part) => Number(part.trim()))
      return { r, g, b, a }
    }
    function luminance({ r, g, b }) {
      const convert = (channel) => {
        const value = channel / 255
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b)
    }
    function contrast(fg, bg) {
      const a = luminance(fg) + 0.05
      const b = luminance(bg) + 0.05
      return Math.max(a, b) / Math.min(a, b)
    }
    function effectiveBg(element) {
      let current = element
      while (current && current !== document.documentElement) {
        const bg = parseRgb(getComputedStyle(current).backgroundColor)
        if (bg && bg.a > 0.2) return bg
        current = current.parentElement
      }
      return parseRgb(getComputedStyle(document.body).backgroundColor) || { r: 5, g: 6, b: 7, a: 1 }
    }
    const lowContrast = [...document.querySelectorAll('body *')]
      .filter(visible)
      .filter((element) => (element.textContent || '').trim().length > 0 && element.children.length === 0)
      .map((element) => {
        const style = getComputedStyle(element)
        const fg = parseRgb(style.color)
        if (!fg) return null
        const ratio = contrast(fg, effectiveBg(element))
        return { selector: selectorFor(element), text: (element.textContent || '').trim().slice(0, 80), ratio: Math.round(ratio * 10) / 10 }
      })
      .filter(Boolean)
      .filter((item) => item.ratio < 4.5)
      .slice(0, 20)

    const controlInventory = interactive
      .map((element) => {
        const box = element.getBoundingClientRect()
        const tag = element.tagName.toLowerCase()
        const role = element.getAttribute('role') || (tag === 'a' ? 'link' : tag === 'button' ? 'button' : tag)
        const name = accessibleName(element).replace(/\s+/g, ' ').slice(0, 120)
        return {
          selector: selectorFor(element),
          role,
          name,
          disabled: Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true'),
          pressed: element.getAttribute('aria-pressed'),
          width: Math.round(box.width),
          height: Math.round(box.height),
        }
      })
      .filter((item) => item.name || ['input', 'select', 'textarea'].includes(item.role))
      .slice(0, 90)

    const formInventory = [...document.querySelectorAll('form, .field, label, input, select, textarea')]
      .filter(visible)
      .map((element) => {
        const labelText = element.tagName.toLowerCase() === 'label'
          ? (element.textContent || '').trim().replace(/\s+/g, ' ')
          : (element.closest('label')?.textContent || element.previousElementSibling?.textContent || element.getAttribute('placeholder') || element.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')
        return {
          selector: selectorFor(element),
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute('type') || '',
          label: labelText.slice(0, 120),
          value: ['password', 'file'].includes(element.getAttribute('type')) ? '' : String(element.value || '').slice(0, 80),
        }
      })
      .filter((item) => item.tag !== 'label' || item.label)
      .slice(0, 80)

    const dialogInventory = [...document.querySelectorAll('[role="dialog"], .modal-content, .media-modal, .native-app-sheet, .native-transaction-sheet, .native-update-gate')]
      .filter(visible)
      .map((element) => ({
        selector: selectorFor(element),
        title: (element.querySelector('h1,h2,h3,[aria-label]')?.textContent || element.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 140),
        text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300),
      }))
      .slice(0, 12)

    const configRows = [...document.querySelectorAll('.native-toggle-row, .module-settings-row, .native-settings-row, .native-menu-row, .native-notification-pref, .settings-version-card, .native-status-strip')]
      .filter(visible)
      .map((element) => (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 180))
      .filter(Boolean)
      .slice(0, 60)

    const textFull = document.body.innerText
    const stateFlags = {
      cached: /cached|cache/i.test(textFull),
      sync: /sync|synced|watermark|refresh/i.test(textFull),
      offline: /offline|local/i.test(textFull),
      empty: /no .*yet|no .*found|empty|not connected/i.test(textFull),
      error: /error|failed|blocked|denied|unavailable/i.test(textFull),
      import: /import|preview|upload|csv|backup/i.test(textFull),
      settings: /settings|preferences|configure|enable|disable/i.test(textFull),
    }

    const tabbar = document.querySelector('.native-tabbar')?.getBoundingClientRect()
    const main = document.querySelector('main, .content, [data-testid="native-dashboard"], .native-page, .native-settings-page')
    const frame = document.querySelector('.record-shell__frame')
    const bottomClearance = (main ? Number.parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0)
      + (frame ? Number.parseFloat(getComputedStyle(frame).paddingBottom) || 0 : 0)

    return {
      url: location.pathname + location.search,
      title: document.title,
      headings: [...document.querySelectorAll('h1,h2,h3')].filter(visible).map((h) => ({ level: h.tagName, text: h.textContent.trim().slice(0, 120) })).slice(0, 20),
      text: document.body.innerText.slice(0, 5000),
      viewport: { width: innerWidth, height: innerHeight },
      documentHeight: document.documentElement.scrollHeight,
      overflow: {
        document: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1,
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        local: localOverflow,
      },
      activeTabCount: document.querySelectorAll('.native-tabbar__item.is-active, .native-tabbar__item.active').length,
      smallTargets: smallTargets.slice(0, 30),
      unnamedControls: unnamedControls.slice(0, 30),
      lowContrast,
      largeEmptyBlocks,
      inventory: {
        controls: controlInventory,
        forms: formInventory,
        dialogs: dialogInventory,
        configRows,
        stateFlags,
      },
      bottomOverlapRisk: Boolean(tabbar && bottomClearance < tabbar.height + 8),
      crashed: document.body.innerText.trim().length < 20 || document.querySelector('[role="alert"]')?.textContent?.match(/cannot|error|undefined/i),
      shell: {
        hasNativeHeader: Boolean(document.querySelector('.native-app-header')),
        hasBottomTabbar: Boolean(document.querySelector('.native-tabbar')),
        hasSettingsButton: Boolean(document.querySelector('[aria-label*="settings" i]')),
      },
    }
  })
}

const nativeRoutes = [
  ['Overview', '/home'],
  ['Overview', '/menu'],
  ['Public/Auth', '/'],
  ['Public/Auth', '/login'],
  ['Public/Auth', '/register'],
  ['Training', '/workout'],
  ['Training', '/workout/active'],
  ['Training', '/workout/history'],
  ['Training', '/workout/exercises'],
  ['Training', '/workout/bodyweight'],
  ['Training', '/workout/import'],
  ['Habits', '/habits'],
  ['Habits', '/habits?view=plan'],
  ['Habits', '/habits?view=history'],
  ['Habits', '/habits?view=insights'],
  ['Habits', '/habits/settings'],
  ['Habits', '/habits/settings?tab=habits'],
  ['Habits', '/habits/settings?tab=reminders'],
  ['Habits', '/habits/settings?tab=import'],
  ['Habits', '/habits/import'],
  ['Finance', '/finance'],
  ['Finance', '/finance/transactions'],
  ['Finance', '/finance/budgets'],
  ['Finance', '/finance/trends'],
  ['Finance', '/finance/import'],
  ['Finance', '/finance/settings'],
  ['Finance', '/finance/settings?tab=wallets'],
  ['Finance', '/finance/settings?tab=categories'],
  ['Finance', '/finance/settings?tab=subscriptions'],
  ['Finance', '/finance/settings?tab=budgets'],
  ['Finance', '/finance/wallets'],
  ['Finance', '/finance/categories'],
  ['Music', '/spotify/personal'],
  ['Music', '/spotify/ranking'],
  ['Music', '/spotify/global'],
  ['Media', '/media'],
  ['Media', '/media/import'],
  ['Media', '/media/settings'],
  ['Assistant', '/chat'],
  ['Settings', '/settings'],
  ['Settings', '/settings?section=account'],
  ['Settings', '/settings?section=connections'],
  ['Settings', '/settings?section=integrations'],
  ['Settings', '/settings?section=modules'],
  ['Settings', '/settings?section=notifications'],
  ['Settings', '/settings?section=widgets'],
  ['Settings', '/settings?section=sync'],
  ['Settings', '/settings?section=updates'],
  ['Settings', '/settings?section=appearance'],
  ['Settings', '/settings?section=data'],
  ['Settings', '/settings?section=agent-keys'],
]

const desktopRoutes = [
  ['Desktop landing', '/'],
  ['Desktop overview', '/home'],
  ['Desktop training', '/workout'],
  ['Desktop workout active', '/workout/active'],
  ['Desktop workout history', '/workout/history'],
  ['Desktop workout exercises', '/workout/exercises'],
  ['Desktop workout bodyweight', '/workout/bodyweight'],
  ['Desktop habits', '/habits'],
  ['Desktop habits settings', '/habits/settings'],
  ['Desktop habits reminders', '/habits/settings?tab=reminders'],
  ['Desktop habits import', '/habits/settings?tab=import'],
  ['Desktop finance', '/finance'],
  ['Desktop transactions', '/finance/transactions'],
  ['Desktop budgets', '/finance/budgets'],
  ['Desktop trends', '/finance/trends'],
  ['Desktop finance import', '/finance/import'],
  ['Desktop finance wallets', '/finance/settings?tab=wallets'],
  ['Desktop finance categories', '/finance/settings?tab=categories'],
  ['Desktop finance subscriptions', '/finance/settings?tab=subscriptions'],
  ['Desktop finance budgets', '/finance/settings?tab=budgets'],
  ['Desktop music personal', '/spotify/personal'],
  ['Desktop music ranking', '/spotify/ranking'],
  ['Desktop music global', '/spotify/global'],
  ['Desktop media', '/media'],
  ['Desktop media import', '/media/import'],
  ['Desktop media settings', '/media/settings'],
  ['Desktop assistant', '/chat'],
  ['Desktop settings', '/settings'],
  ['Desktop settings account', '/settings?tab=account'],
  ['Desktop settings connections', '/settings?tab=connections'],
  ['Desktop settings agent keys', '/settings?tab=agent-keys'],
  ['Desktop settings appearance', '/settings?tab=appearance'],
  ['Desktop settings modules', '/settings?tab=modules'],
  ['Desktop settings data', '/settings?tab=data'],
]

async function auditContext(browser, { native, viewport, label, routes }) {
  const context = await browser.newContext({
    viewport,
    userAgent: native
      ? 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36'
      : undefined,
    deviceScaleFactor: native ? 2 : 1,
    isMobile: native,
    hasTouch: native,
  })
  const page = await context.newPage()
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await mockApis(page)
  await page.addInitScript(({ native }) => {
    if (native) {
      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        Plugins: {
          PersonalServerWidgets: {
            getWidgetStatus: async () => ({ supported: true, pinningSupported: true, lockScreenEligible: true, lockScreenAvailability: 'Samsung One UI may restrict lock-screen widgets.' }),
            refreshWidgets: async () => ({}),
          },
          PersonalServerHealth: {
            getStatus: async () => ({ available: true, permissionsGranted: true, status: 'ready' }),
            requestPermissions: async () => ({ available: true, permissionsGranted: true, status: 'ready' }),
            getStepSyncStatus: async () => ({ enabled: true, scheduled: true, intervalMinutes: 60 }),
            configureStepSync: async () => ({ enabled: true, scheduled: true, intervalMinutes: 60 }),
            getSyncedActivityMetrics: async () => ({ today: { steps: 6420 }, week: { steps: 43100, daysWithData: 7 } }),
          },
          PersonalServerPayments: {
            getStatus: async () => ({ enabled: true, notificationAccess: true, pendingCount: 1, packages: [] }),
            configure: async () => ({ enabled: true, notificationAccess: true, pendingCount: 1, packages: [] }),
            syncSuggestions: async () => [],
          },
          LocalNotifications: {
            checkPermissions: async () => ({ display: 'granted' }),
            requestPermissions: async () => ({ display: 'granted' }),
            areEnabled: async () => ({ value: true }),
            checkExactNotificationSetting: async () => ({ value: 'granted' }),
            createChannel: async () => ({}),
            schedule: async () => ({}),
            cancel: async () => ({}),
            changeExactNotificationSetting: async () => ({}),
          },
        },
      }
      window.__NATIVE_APP__ = true
    }
    localStorage.setItem('accessToken', 'audit-access')
    localStorage.setItem('refreshToken', 'audit-refresh')
  }, { native })

  const results = []
  for (const [group, routePath] of routes) {
    const route = { group, path: routePath }
    const beforeErrors = pageErrors.length
    const beforeConsole = consoleErrors.length
    await page.goto(`${baseURL}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {})
    await page.waitForTimeout(450)
    const metrics = await collectMetrics(page).catch((error) => ({
      url: routePath,
      text: '',
      viewport,
      headings: [],
      overflow: { document: true, local: [] },
      activeTabCount: 0,
      smallTargets: [],
      unnamedControls: [],
      lowContrast: [],
      largeEmptyBlocks: [],
      bottomOverlapRisk: false,
      crashed: true,
      shell: {},
      collectionError: error.message,
    }))
    metrics.pageErrors = pageErrors.slice(beforeErrors).filter((message) => !String(message).includes('LocalNotifications.then()'))
    metrics.consoleErrors = consoleErrors.slice(beforeConsole).slice(0, 10)
    if (metrics.pageErrors.length || metrics.consoleErrors.some((message) => /Route render failed|The above error occurred/i.test(message))) {
      metrics.crashed = true
    }
    const screenshotName = `${label}-${safeFileName(group)}-${safeFileName(routePath || 'root')}.png`
    const screenshotPath = path.join(outDir, screenshotName)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    const findings = makeFindings(route, metrics)
    results.push({ ...route, screenshot: screenshotName, metrics, findings })
  }
  await context.close()
  return results
}

async function installNativeAuditGlobals(page, native) {
  await page.addInitScript(({ native }) => {
    if (native) {
      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        Plugins: {
          PersonalServerWidgets: {
            getWidgetStatus: async () => ({ supported: true, pinningSupported: true, lockScreenEligible: true, lockScreenAvailability: 'Samsung One UI may restrict lock-screen widgets.' }),
            refreshWidgets: async () => ({}),
            pinWidget: async () => ({ requested: true }),
          },
          PersonalServerHealth: {
            getStatus: async () => ({ available: true, permissionsGranted: true, status: 'ready' }),
            requestPermissions: async () => ({ available: true, permissionsGranted: true, granted: true, status: 'ready' }),
            getStepSyncStatus: async () => ({ supported: true, enabled: true, scheduled: true, intervalMinutes: 60 }),
            configureStepSync: async () => ({ supported: true, enabled: true, scheduled: true, intervalMinutes: 60 }),
            getSyncedActivityMetrics: async () => ({ today: { steps: 6420 }, week: { steps: 43100, daysWithData: 7 }, recent: [] }),
            syncSteps: async () => ({ imported: 7 }),
            openSettings: async () => ({ opened: true }),
          },
          PersonalServerPayments: {
            getStatus: async () => ({ supported: true, enabled: true, notificationAccess: true, pendingCount: 1, packages: [] }),
            configure: async () => ({ supported: true, enabled: true, notificationAccess: true, pendingCount: 1, packages: [] }),
            syncSuggestions: async () => [{ id: 'local-payment-1' }],
            openNotificationSettings: async () => ({ opened: true }),
          },
          LocalNotifications: {
            checkPermissions: async () => ({ display: 'granted' }),
            requestPermissions: async () => ({ display: 'granted' }),
            areEnabled: async () => ({ value: true }),
            checkExactNotificationSetting: async () => ({ value: 'granted' }),
            createChannel: async () => ({}),
            schedule: async () => ({}),
            cancel: async () => ({}),
            changeExactNotificationSetting: async () => ({}),
          },
          AppLauncher: {
            openUrl: async () => ({ completed: true }),
          },
        },
      }
      window.__NATIVE_APP__ = true
    }
    localStorage.setItem('accessToken', 'audit-access')
    localStorage.setItem('refreshToken', 'audit-refresh')
  }, { native })
}

async function clickFirst(page, candidates) {
  for (const candidate of candidates) {
    try {
      let locator
      if (candidate.role) {
        locator = page.getByRole(candidate.role, { name: candidate.name })
      } else if (candidate.text) {
        locator = page.getByText(candidate.text, { exact: candidate.exact === true })
      } else {
        locator = page.locator(candidate.selector)
      }
      const count = await locator.count().catch(() => 0)
      if (!count) continue
      for (let index = 0; index < count; index += 1) {
        const target = locator.nth(index)
        if (!(await target.isVisible().catch(() => false))) continue
        await target.click({ timeout: 2500 })
        return candidate.label || candidate.selector || String(candidate.name || candidate.text)
      }
    } catch {}
  }
  return null
}

const interactionScenarios = [
  {
    group: 'Navigation',
    state: 'Records register',
    path: '/home',
    description: 'Stable global navigation opens the searchable records register.',
    action: async (page) => clickFirst(page, [{ role: 'link', name: /^Records$/i, label: 'Records navigation' }]),
  },
  {
    group: 'Finance',
    state: 'Add transaction sheet',
    path: '/finance/transactions',
    description: 'Expense/income/transfer transaction creation flow.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /\bAdd\b/i, label: 'Add transaction' }]),
  },
  {
    group: 'Finance',
    state: 'Edit transaction sheet',
    path: '/finance/transactions',
    description: 'Existing transaction edit/delete flow.',
    action: async (page) => clickFirst(page, [{ text: 'Revolut Ultra', label: 'Existing transaction' }]),
  },
  {
    group: 'Finance',
    state: 'Wallet form',
    path: '/finance/settings?tab=wallets',
    description: 'Wallet add/edit configuration.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Add Wallet/i, label: 'Add Wallet' }]),
  },
  {
    group: 'Finance',
    state: 'Category form',
    path: '/finance/settings?tab=categories',
    description: 'Category add/edit configuration with icon, color, and hierarchy.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Add Category/i, label: 'Add Category' }]),
  },
  {
    group: 'Finance',
    state: 'Subscription form',
    path: '/finance/settings?tab=subscriptions',
    description: 'Recurring subscription configuration.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Add Subscription/i, label: 'Add Subscription' }]),
  },
  {
    group: 'Finance',
    state: 'Budget form',
    path: '/finance/settings?tab=budgets',
    description: 'Budget creation and category assignment.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Add Budget/i, label: 'Add Budget' }]),
  },
  {
    group: 'Habits',
    state: 'Add habit modal',
    path: '/habits/settings',
    description: 'Habit creation with type, thresholds, frequency, active state, icon, and color.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Add Habit/i, label: 'Add Habit' }]),
  },
  {
    group: 'Habits',
    state: 'Edit habit modal',
    path: '/habits/settings',
    description: 'Existing habit edit/delete configuration.',
    action: async (page) => clickFirst(page, [{ text: 'Sleep', label: 'Habit row' }]),
  },
  {
    group: 'Habits',
    state: 'Numeric habit controls',
    path: '/habits',
    description: 'Daily numeric logging control for counter-type habits.',
    action: async (page) => {
      const card = page.locator('article, .native-habit-card, .card').filter({ hasText: 'Caffeine' }).first()
      if (await card.count().catch(() => 0)) {
        const plus = card.getByRole('button', { name: /\+/ }).first()
        if (await plus.isVisible().catch(() => false)) {
          await plus.click()
          return 'Caffeine plus'
        }
      }
      return null
    },
  },
  {
    group: 'Training',
    state: 'Inline set controls',
    path: '/workout/active',
    description: 'Active workout set entry remains directly editable without a modal.',
    action: async (page) => {
      const picker = page.getByRole('combobox').first()
      return await picker.isVisible().catch(() => false) ? 'Inline exercise picker' : null
    },
  },
  {
    group: 'Training',
    state: 'End workout modal',
    path: '/workout/active',
    description: 'Workout completion title and notes flow.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Finish|End Workout/i, label: 'Finish workout' }]),
  },
  {
    group: 'Training',
    state: 'Exercise form',
    path: '/workout/exercises',
    description: 'Exercise creation and category assignment.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Add Exercise/i, label: 'Add Exercise' }]),
  },
  {
    group: 'Training',
    state: 'Workout category form',
    path: '/workout/exercises',
    description: 'Workout category creation and color configuration.',
    action: async (page) => {
      await clickFirst(page, [{ role: 'button', name: /Categories/i, label: 'Categories tab' }])
      return clickFirst(page, [{ role: 'button', name: /Add Category/i, label: 'Add Category' }])
    },
  },
  {
    group: 'Training',
    state: 'Bodyweight form',
    path: '/workout/bodyweight',
    description: 'Bodyweight date, weight, and note entry.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Log Weight/i, label: 'Log Weight' }]),
  },
  {
    group: 'Training',
    state: 'Workout detail modal',
    path: '/workout/history',
    description: 'Historical workout detail, sets, notes, and destructive delete action.',
    action: async (page) => clickFirst(page, [{ text: 'Upper body', label: 'Workout session' }]),
  },
  {
    group: 'Media',
    state: 'Add media modal',
    path: '/media',
    description: 'Media search/manual creation flow.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Add/i, label: 'Add media' }, { role: 'button', name: /Add Your First Item/i, label: 'Add first media' }]),
  },
  {
    group: 'Media',
    state: 'Manual media modal',
    path: '/media',
    description: 'Manual media creation with type/status/rating.',
    action: async (page) => {
      await clickFirst(page, [{ role: 'button', name: /Add/i, label: 'Add media' }, { role: 'button', name: /Add Your First Item/i, label: 'Add first media' }])
      return clickFirst(page, [{ role: 'button', name: /Manual/i, label: 'Manual tab' }])
    },
  },
  {
    group: 'Music',
    state: 'Stream history modal',
    path: '/spotify/personal',
    description: 'Full recent streams history modal.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /View all|Show all recent streams/i, label: 'Show recent streams' }]),
  },
  {
    group: 'Settings',
    state: 'Agent key create modal',
    path: '/settings?section=agent-keys',
    description: 'External agent API key creation, scopes, expiration, and generated setup instructions.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /New Key|Create First Key/i, label: 'New Key' }]),
  },
  {
    group: 'Settings',
    state: 'Agent key edit modal',
    path: '/settings?section=agent-keys',
    description: 'External agent API key name/scope editing.',
    action: async (page) => clickFirst(page, [{ selector: 'button[title="Edit"]', label: 'Edit key' }]),
  },
  {
    group: 'Settings',
    state: 'Agent key delete modal',
    path: '/settings?section=agent-keys',
    description: 'Permanent agent API key deletion confirmation.',
    action: async (page) => clickFirst(page, [{ selector: 'button[title="Delete permanently"]', label: 'Delete key' }]),
  },
  {
    group: 'Settings',
    state: 'Data delete confirmation',
    path: '/settings?section=data',
    description: 'Destructive module data deletion confirmation flow.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Delete All/i, label: 'Delete All' }]),
  },
  {
    group: 'Settings',
    state: 'Notification preferences',
    path: '/settings?section=notifications',
    description: 'Notification permission, reminder types, quiet hours, and test notification controls.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Send test/i, label: 'Send test notification' }]),
  },
  {
    group: 'Settings',
    state: 'Module visibility controls',
    path: '/settings?section=modules',
    description: 'Feature active/home/widgets/background sync configuration.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Feature active/i, label: 'Feature active toggle' }]),
  },
  {
    group: 'Settings',
    state: 'Health Connect controls',
    path: '/settings?section=integrations',
    description: 'Step permission, live step stream, background sync, and payment prompt controls.',
    action: async (page) => clickFirst(page, [{ role: 'button', name: /Sync 30 days/i, label: 'Sync 30 days' }]),
  },
]

async function auditInteractions(browser, { native, viewport, label }) {
  const context = await browser.newContext({
    viewport,
    userAgent: native
      ? 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36'
      : undefined,
    deviceScaleFactor: native ? 2 : 1,
    isMobile: native,
    hasTouch: native,
  })
  const page = await context.newPage()
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await mockApis(page)
  await installNativeAuditGlobals(page, native)
  const results = []
  for (const scenario of interactionScenarios) {
    const beforeErrors = pageErrors.length
    const beforeConsole = consoleErrors.length
    await page.goto(`${baseURL}${scenario.path}`, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {})
    await page.waitForTimeout(650)
    const openedTarget = await scenario.action(page).catch((error) => `action error: ${error.message}`)
    await page.waitForTimeout(450)
    const metrics = await collectMetrics(page).catch((error) => ({
      url: scenario.path,
      text: '',
      viewport,
      headings: [],
      overflow: { document: true, local: [] },
      activeTabCount: 0,
      smallTargets: [],
      unnamedControls: [],
      lowContrast: [],
      largeEmptyBlocks: [],
      inventory: { controls: [], forms: [], dialogs: [], configRows: [], stateFlags: {} },
      bottomOverlapRisk: false,
      crashed: true,
      shell: {},
      collectionError: error.message,
    }))
    metrics.pageErrors = pageErrors.slice(beforeErrors).filter((message) => !String(message).includes('LocalNotifications.then()'))
    metrics.consoleErrors = consoleErrors.slice(beforeConsole).slice(0, 10)
    const screenshotName = `${label}-interaction-${safeFileName(scenario.group)}-${safeFileName(scenario.state)}.png`
    await page.screenshot({ path: path.join(outDir, screenshotName), fullPage: false })
    const route = { group: `${scenario.group} interaction`, path: `${scenario.path} :: ${scenario.state}` }
    const findings = makeFindings(route, metrics)
    if (!openedTarget && metrics.inventory.dialogs.length === 0 && !/controls|preferences|numeric/i.test(scenario.state)) {
      findings.push({
        severity: 'high',
        area: 'Interaction reachability',
        issue: `Could not open expected state: ${scenario.state}`,
        recommendation: 'Make the action discoverable with a stable visible control and a named accessible target.',
      })
    }
    results.push({
      group: scenario.group,
      path: scenario.path,
      state: scenario.state,
      description: scenario.description,
      openedTarget,
      screenshot: screenshotName,
      metrics,
      findings,
    })
  }
  await context.close()
  return results
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })
  const browser = await chromium.launch()
  try {
    const nativeS24 = await auditContext(browser, {
      native: true,
      viewport: { width: 486, height: 962 },
      label: 'native-s24',
      routes: nativeRoutes,
    })
    const nativeSmall = await auditContext(browser, {
      native: true,
      viewport: { width: 320, height: 568 },
      label: 'native-small',
      routes: nativeRoutes.filter(([, route]) => ['/home', '/menu', '/habits', '/finance', '/finance/transactions', '/spotify/ranking', '/media', '/chat', '/settings'].includes(route)),
    })
    const desktop = await auditContext(browser, {
      native: false,
      viewport: { width: 1440, height: 1000 },
      label: 'desktop',
      routes: desktopRoutes,
    })
    const interactions = await auditInteractions(browser, {
      native: true,
      viewport: { width: 486, height: 962 },
      label: 'native-s24',
    })
    const audit = {
      generatedAt: new Date().toISOString(),
      baseURL,
      method: {
        nativeViewports: [{ width: 486, height: 962, name: 'Samsung S24 Ultra CSS viewport' }, { width: 320, height: 568, name: 'small Android stress viewport' }],
        desktopViewports: [{ width: 1440, height: 1000 }],
        checks: ['screenshots', 'horizontal overflow', 'local scroll containers', 'active nav count', 'touch target size', 'accessible names', 'sampled text contrast', 'large empty blocks', 'bottom tabbar overlap', 'console/page errors', 'visible controls', 'forms', 'dialogs/sheets', 'configuration rows', 'interactive popup states'],
      },
      results: [...nativeS24, ...nativeSmall, ...desktop],
      interactions,
    }
    await fs.writeFile(path.join(outDir, 'audit-results.json'), JSON.stringify(audit, null, 2))
    const findingCount = audit.results.reduce((sum, result) => sum + result.findings.length, 0) +
      audit.interactions.reduce((sum, result) => sum + result.findings.length, 0)
    console.log(JSON.stringify({
      routes: audit.results.length,
      interactions: audit.interactions.length,
      findings: findingCount,
      screenshots: audit.results.length + audit.interactions.length,
      out: path.join(outDir, 'audit-results.json'),
    }, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
