export const FEATURE_MODULES = [
  { id: 'training', appId: 'training', label: 'Gym', icon: 'dumbbell', defaultHome: true, defaultWidgets: true, paths: ['/workout'] },
  { id: 'habits', appId: 'habits', label: 'Habits', icon: 'heart-pulse', defaultHome: true, defaultWidgets: true, paths: ['/habits'] },
  { id: 'finance', appId: 'money', label: 'Cash', icon: 'wallet', defaultHome: true, defaultWidgets: true, paths: ['/finance'] },
  { id: 'music', appId: 'music', label: 'Music', icon: 'music', defaultHome: true, defaultWidgets: true, paths: ['/spotify', '/streams', '/albums', '/artists', '/playlists'] },
  { id: 'media', appId: 'media', label: 'Series', icon: 'clapperboard', defaultHome: false, defaultWidgets: false, paths: ['/media'] },
  { id: 'assistant', appId: 'assistant', label: 'Assistant', icon: 'message-square', defaultHome: true, defaultWidgets: false, paths: ['/chat'] },
]

export const DEFAULT_FEATURE_MODULES = Object.fromEntries(
  FEATURE_MODULES.map((module) => [
    module.id,
    {
      enabled: true,
      showOnHome: module.defaultHome,
      showOnWidgets: module.defaultWidgets,
      syncEnabled: true,
    },
  ]),
)

export const DEFAULT_HOME_WIDGETS = [
  { id: 'habits-today', module: 'habits', visible: true, order: 10 },
  { id: 'training-today', module: 'training', visible: true, order: 20 },
  { id: 'finance-today', module: 'finance', visible: true, order: 30 },
  { id: 'music-ranking', module: 'music', visible: true, order: 40 },
  { id: 'assistant-prompt', module: 'assistant', visible: true, order: 50 },
  { id: 'media-library', module: 'media', visible: false, order: 60 },
]

export const DEFAULT_HOME_LAYOUT = {
  widgets: DEFAULT_HOME_WIDGETS,
}

export const DEFAULT_WIDGET_LAYOUT = {
  today: {
    showScore: true,
    metrics: ['habits', 'training', 'finance', 'music'],
  },
  lockScreen: {
    showScore: true,
    metrics: ['habits'],
    allowSensitive: false,
  },
}

const APP_ID_TO_MODULE = Object.fromEntries(FEATURE_MODULES.map((module) => [module.appId, module.id]))

const METRIC_TO_MODULE = {
  habits: 'habits',
  training: 'training',
  workouts: 'training',
  steps: 'training',
  finance: 'finance',
  spend: 'finance',
  music: 'music',
  streams: 'music',
  media: 'media',
  assistant: 'assistant',
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizeModule(module, value) {
  const input = asObject(value)
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : true,
    showOnHome: typeof input.showOnHome === 'boolean' ? input.showOnHome : module.defaultHome,
    showOnWidgets: typeof input.showOnWidgets === 'boolean' ? input.showOnWidgets : module.defaultWidgets,
    syncEnabled: typeof input.syncEnabled === 'boolean' ? input.syncEnabled : true,
  }
}

function normalizeHomeLayout(input) {
  const layout = asObject(input)
  const hasProvidedWidgets = Array.isArray(layout.widgets)
  const provided = hasProvidedWidgets ? layout.widgets : DEFAULT_HOME_WIDGETS
  const byId = new Map(DEFAULT_HOME_WIDGETS.map((widget) => [widget.id, { ...widget }]))
  const widgets = []
  for (const widget of provided) {
    if (!widget || typeof widget !== 'object' || !widget.id || !byId.has(widget.id)) continue
    const base = byId.get(widget.id)
    widgets.push({
      ...base,
      visible: typeof widget.visible === 'boolean' ? widget.visible : base.visible,
      order: Number.isFinite(Number(widget.order)) ? Number(widget.order) : base.order,
    })
  }
  return {
    widgets: (hasProvidedWidgets ? widgets : [...byId.values()]).sort((a, b) => a.order - b.order),
  }
}

function metricEnabled(metric, featureModules) {
  const moduleId = METRIC_TO_MODULE[metric]
  if (!moduleId) return false
  const module = featureModules[moduleId]
  return module?.enabled !== false && module?.showOnWidgets !== false
}

function normalizeMetrics(inputMetrics, fallbackMetrics, featureModules) {
  const source = Array.isArray(inputMetrics) ? inputMetrics : fallbackMetrics
  const seen = new Set()
  const metrics = []
  for (const metric of source) {
    const id = String(metric || '')
    if (!id || seen.has(id) || !metricEnabled(id, featureModules)) continue
    seen.add(id)
    metrics.push(id)
  }
  return metrics
}

function normalizeWidgetLayout(input, featureModules) {
  const layout = asObject(input)
  const today = asObject(layout.today)
  const lockScreen = asObject(layout.lockScreen)
  return {
    today: {
      showScore: typeof today.showScore === 'boolean' ? today.showScore : DEFAULT_WIDGET_LAYOUT.today.showScore,
      metrics: normalizeMetrics(today.metrics, DEFAULT_WIDGET_LAYOUT.today.metrics, featureModules),
    },
    lockScreen: {
      showScore: typeof lockScreen.showScore === 'boolean' ? lockScreen.showScore : DEFAULT_WIDGET_LAYOUT.lockScreen.showScore,
      metrics: normalizeMetrics(lockScreen.metrics, DEFAULT_WIDGET_LAYOUT.lockScreen.metrics, featureModules),
      allowSensitive: lockScreen.allowSensitive === true,
    },
  }
}

export function getFeatureModulePreferences(input = {}) {
  const source = asObject(input)
  const incomingModules = asObject(source.featureModules)
  const featureModules = Object.fromEntries(
    FEATURE_MODULES.map((module) => [module.id, normalizeModule(module, incomingModules[module.id])]),
  )
  const homeLayout = normalizeHomeLayout(source.homeLayout)
  const widgetLayout = normalizeWidgetLayout(source.widgetLayout, featureModules)
  return {
    featureModules,
    homeLayout,
    widgetLayout,
  }
}

export function isFeatureEnabled(prefs, moduleId) {
  const normalized = getFeatureModulePreferences(prefs)
  return normalized.featureModules[moduleId]?.enabled !== false
}

export function isFeatureShownOnHome(prefs, moduleId) {
  const normalized = getFeatureModulePreferences(prefs)
  const module = normalized.featureModules[moduleId]
  return module?.enabled !== false && module?.showOnHome !== false
}

export function isFeatureShownOnWidgets(prefs, moduleId) {
  const normalized = getFeatureModulePreferences(prefs)
  const module = normalized.featureModules[moduleId]
  return module?.enabled !== false && module?.showOnWidgets !== false
}

export function isFeatureSyncEnabled(prefs, moduleId) {
  const normalized = getFeatureModulePreferences(prefs)
  const module = normalized.featureModules[moduleId]
  return module?.enabled !== false && module?.syncEnabled !== false
}

export function isNativeAppEnabled(app, prefs) {
  const moduleId = APP_ID_TO_MODULE[app?.id]
  if (!moduleId) return true
  return isFeatureEnabled(prefs, moduleId)
}

export function filterEnabledNativeApps(apps, prefs) {
  return apps.filter((app) => isNativeAppEnabled(app, prefs))
}

export function getEnabledHomeWidgets(prefs) {
  const normalized = getFeatureModulePreferences(prefs)
  return normalized.homeLayout.widgets
    .filter((widget) => widget.visible !== false)
    .filter((widget) => isFeatureShownOnHome(normalized, widget.module))
    .sort((a, b) => a.order - b.order)
}

export function getEnabledWidgetMetrics(prefs) {
  return getFeatureModulePreferences(prefs).widgetLayout.today.metrics
}

export function getEnabledPreloadPaths(paths, prefs) {
  const normalized = getFeatureModulePreferences(prefs)
  return paths.filter((path) => {
    const normalizedPath = String(path || '')
    const matchedModule = FEATURE_MODULES.find((module) => (
      module.paths.some((prefix) => normalizedPath.startsWith(prefix))
    ))
    if (!matchedModule) return true
    return isFeatureSyncEnabled(normalized, matchedModule.id)
  })
}

export function getModuleIdForNativeApp(appId) {
  return APP_ID_TO_MODULE[appId] || null
}

export function getModuleIdForPath(path) {
  const normalizedPath = String(path || '/').split('?')[0]
  const module = FEATURE_MODULES.find((item) => (
    item.paths.some((prefix) => normalizedPath.startsWith(prefix))
  ))
  return module?.id || null
}
