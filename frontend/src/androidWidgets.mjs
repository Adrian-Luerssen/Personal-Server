function numberValue(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function absoluteRounded(value) {
  return Math.round(Math.abs(numberValue(value)))
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

export function createAndroidWidgetSnapshot(dashboard = {}) {
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
  const monthlySpend =
    dashboard.finance?.summary?.totalExpense ??
    dashboard.finance?.summary?.totalExpenses ??
    dashboard.finance?.monthlySpent ??
    0
  const streams =
    dashboard.weeklySummary?.streams ??
    dashboard.spotify?.stats?.totalStreams ??
    dashboard.spotify?.stats?.streams ??
    0
  const habitsRemaining = Math.max(0, habitsTotal - habitsDone)
  const lockScreenStatus =
    habitsTotal === 0
      ? 'No active habits'
      : habitsRemaining === 0
        ? 'All habits logged'
        : `${pluralizeHabit(habitsRemaining)} remaining`

  return {
    score: Math.round(numberValue(dashboard.intelligence?.score, 0)),
    habitsDone,
    habitsTotal,
    habitsRemaining,
    workoutsThisWeek: Math.round(numberValue(workoutsThisWeek)),
    monthlySpend: absoluteRounded(monthlySpend),
    streams: Math.round(numberValue(streams)),
    generatedAt: dashboard.generatedAt || new Date().toISOString(),
    status: dashboard.status || 'Fresh snapshot',
    lockScreenStatus,
    lockScreenSensitive: false,
  }
}

function resolveWidgetPlugin(explicitPlugin) {
  if (explicitPlugin) return explicitPlugin
  if (typeof window === 'undefined') return null
  return window.Capacitor?.Plugins?.PersonalServerWidgets || null
}

export async function saveAndroidWidgetSnapshot(dashboard, options = {}) {
  const plugin = resolveWidgetPlugin(options.plugin)
  if (!plugin || typeof plugin.saveSnapshot !== 'function') return false

  const snapshot = createAndroidWidgetSnapshot(dashboard)
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
