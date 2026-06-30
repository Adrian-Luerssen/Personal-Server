import { getEnabledWidgetMetrics, getFeatureModulePreferences, isFeatureShownOnWidgets } from './modulePreferences.mjs'

function numberValue(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function absoluteRounded(value) {
  return Math.round(Math.abs(numberValue(value)))
}

function compactNumber(value) {
  const number = Math.round(Math.abs(numberValue(value)))
  if (number >= 1_000_000) return `${trimDecimal(number / 1_000_000)}M`
  if (number >= 1_000) return `${trimDecimal(number / 1_000)}K`
  return String(number)
}

function trimDecimal(value) {
  return value.toFixed(1).replace(/\.0$/, '')
}

function firstPositiveNumber(values, fallback = 0) {
  const positive = values.find((value) => numberValue(value) > 0)
  if (positive != null) return positive
  const present = values.find((value) => value != null)
  return present ?? fallback
}

function firstPresentNumber(values, fallback = 0) {
  const present = values.find((value) => value != null && Number.isFinite(Number(value)))
  return present ?? fallback
}

function normalizeCurrency(currency) {
  const normalized = String(currency || 'EUR').trim().toUpperCase()
  return /^[A-Z]{3}$/.test(normalized) ? normalized : 'EUR'
}

function formatBriefMoney(value, currency) {
  return `${normalizeCurrency(currency)} ${compactNumber(value)}`
}

function pluralizeHabit(count) {
  return `${count} habit${count === 1 ? '' : 's'}`
}

function getHabitStatus(habit) {
  if (!habit) return 'none'
  if (habit.todayStatus) return habit.todayStatus
  if (habit.completedToday === true) return 'success'
  if (habit.completedToday === false) return 'none'
  return 'none'
}

export function createAndroidWidgetSnapshot(dashboard = {}, options = {}) {
  const hasPreferenceInput = dashboard.preferences != null || options.preferences != null
  const preferences = getFeatureModulePreferences(options.preferences || dashboard.preferences || {})
  const visibleMetrics = getEnabledWidgetMetrics(preferences)
  const showHabits = !hasPreferenceInput || isFeatureShownOnWidgets(preferences, 'habits')
  const showTraining = !hasPreferenceInput || isFeatureShownOnWidgets(preferences, 'training')
  const showFinance = !hasPreferenceInput || isFeatureShownOnWidgets(preferences, 'finance')
  const showMusic = !hasPreferenceInput || isFeatureShownOnWidgets(preferences, 'music')
  const habits = Array.isArray(dashboard.habits?.today)
    ? dashboard.habits.today
    : Array.isArray(dashboard.habits)
      ? dashboard.habits
      : []
  const habitsDone = habits.filter((habit) => getHabitStatus(habit) === 'success').length
  const habitsTotal = habits.length
  const workoutsThisWeek =
    dashboard.weeklySummary?.workouts ??
    dashboard.weeklySummary?.sessions ??
    dashboard.workout?.totals?.thisWeek ??
    dashboard.workout?.totals?.totalWorkouts ??
    0
  const todaySpend = firstPresentNumber([
    dashboard.today?.financeSpent,
    dashboard.finance?.todaySpent,
    dashboard.finance?.summary?.todayExpense,
  ], null)
  const monthlySpend = todaySpend != null
    ? todaySpend
    : firstPresentNumber([
        dashboard.finance?.summary?.totalExpense,
        dashboard.finance?.summary?.totalExpenses,
        dashboard.finance?.monthlySpent,
      ])
  const explicitTodayStreams = firstPresentNumber([
    dashboard.today?.streams,
    dashboard.spotify?.stats?.todayStreams,
  ], null)
  const streams = explicitTodayStreams != null
    ? explicitTodayStreams
    : firstPositiveNumber([
      dashboard.weeklySummary?.streams,
      dashboard.spotify?.stats?.totalStreams,
      dashboard.spotify?.stats?.streams,
    ])
  const currency = normalizeCurrency(
    dashboard.today?.financeCurrency ??
    dashboard.finance?.currency ??
    dashboard.finance?.summary?.currency,
  )
  const habitsRemaining = Math.max(0, habitsTotal - habitsDone)
  const lockScreenStatus =
    habitsTotal === 0
      ? 'No active habits'
      : habitsRemaining === 0
        ? 'All habits logged'
        : `${pluralizeHabit(habitsRemaining)} remaining`
  const roundedSpend = showFinance ? absoluteRounded(monthlySpend) : 0
  const roundedStreams = showMusic ? Math.round(numberValue(streams)) : 0
  const roundedWorkouts = showTraining ? Math.round(numberValue(workoutsThisWeek)) : 0
  const briefParts = []
  if (showHabits && (!showFinance || !showMusic || visibleMetrics.length <= 2)) {
    briefParts.push(`${habitsDone}/${habitsTotal} habits`)
  }
  if (showTraining) briefParts.push(`${compactNumber(roundedWorkouts)} train`)
  if (showFinance) briefParts.push(`${formatBriefMoney(roundedSpend, currency)} spend`)
  if (showMusic) briefParts.push(`${compactNumber(roundedStreams)} streams`)
  const briefDetail = briefParts.length ? briefParts.join(' - ') : 'Open app to configure widgets'

  const snapshot = {
    score: Math.round(numberValue(dashboard.intelligence?.score, 0)),
    habitsDone: showHabits ? habitsDone : 0,
    habitsTotal: showHabits ? habitsTotal : 0,
    habitsRemaining: showHabits ? habitsRemaining : 0,
    workoutsThisWeek: roundedWorkouts,
    monthlySpend: roundedSpend,
    currency,
    streams: roundedStreams,
    generatedAt: dashboard.generatedAt || new Date().toISOString(),
    status: dashboard.status || lockScreenStatus,
    briefDetail,
    lockScreenStatus: showHabits ? lockScreenStatus : 'Open app to sync',
    lockScreenSensitive: false,
  }

  if (hasPreferenceInput) {
    snapshot.visibleMetrics = visibleMetrics
  }

  return snapshot
}

function resolveWidgetPlugin(explicitPlugin) {
  if (explicitPlugin) return explicitPlugin
  if (typeof window === 'undefined') return null
  return window.Capacitor?.Plugins?.PersonalServerWidgets || null
}

export async function saveAndroidWidgetSnapshot(dashboard, options = {}) {
  const plugin = resolveWidgetPlugin(options.plugin)
  if (!plugin || typeof plugin.saveSnapshot !== 'function') return false

  const snapshot = createAndroidWidgetSnapshot(dashboard, options)
  await plugin.saveSnapshot({ snapshot })

  if (typeof plugin.refreshWidgets === 'function') {
    await plugin.refreshWidgets()
  }

  return true
}

export async function getAndroidWidgetStatus(options = {}) {
  const plugin = resolveWidgetPlugin(options.plugin)
  if (!plugin || typeof plugin.getWidgetStatus !== 'function') {
    return {
      supported: false,
      pinningSupported: false,
      lockScreenEligible: false,
      lockScreenAvailability: 'Native widget bridge is not available in this environment.',
    }
  }

  return plugin.getWidgetStatus()
}

export async function refreshAndroidWidgets(options = {}) {
  const plugin = resolveWidgetPlugin(options.plugin)
  if (!plugin || typeof plugin.refreshWidgets !== 'function') return false
  await plugin.refreshWidgets()
  return true
}

export async function pinAndroidWidget(widget, options = {}) {
  const plugin = resolveWidgetPlugin(options.plugin)
  if (!plugin || typeof plugin.pinWidget !== 'function') {
    return { requested: false, reason: 'pinning-unavailable' }
  }
  return plugin.pinWidget({ widget })
}
