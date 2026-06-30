import { filterEnabledNativeApps, isNativeAppEnabled } from './modulePreferences.mjs'

function normalizePath(path) {
  return String(path || '/').split('?')[0]
}

function destination(path, label, icon, options = {}) {
  return { to: path, label, icon, ...options }
}

const SETTINGS_DATA_PREFIXES = [
  '/workout/import',
  '/habits/settings',
  '/habits/import',
  '/finance/import',
  '/finance/settings',
  '/finance/wallets',
  '/finance/categories',
  '/media/import',
  '/media/settings',
]

function isSettingsDataRoute(path) {
  const pathname = normalizePath(path)
  return SETTINGS_DATA_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export const NATIVE_SETTINGS_APP = {
  id: 'settings',
  label: 'Settings',
  subtitle: 'System control',
  icon: 'settings',
  root: '/settings',
  tone: 'info',
  matches: ['/settings'],
  tabs: [],
}

export const NATIVE_APPS = [
  {
    id: 'overview',
    label: 'Overview',
    subtitle: 'Today',
    icon: 'layout-dashboard',
    root: '/home',
    tone: 'info',
    matches: ['/home', '/menu'],
    tabs: [
      destination('/home', 'Today', 'home', { exact: true }),
      destination('/menu', 'Apps', 'grid-3x3'),
      destination('/chat', 'Assistant', 'message-square', { module: 'assistant' }),
    ],
  },
  {
    id: 'training',
    label: 'Training',
    subtitle: 'Workout log',
    icon: 'dumbbell',
    root: '/workout',
    tone: 'success',
    matches: ['/workout'],
    tabs: [
      destination('/workout', 'Today', 'layout-dashboard', { exact: true }),
      destination('/workout/active', 'Active', 'zap'),
      destination('/workout/history', 'History', 'clock'),
      destination('/workout/exercises', 'Exercises', 'list'),
    ],
  },
  {
    id: 'habits',
    label: 'Habits',
    subtitle: 'Daily routines',
    icon: 'heart-pulse',
    root: '/habits',
    tone: 'habits',
    matches: ['/habits'],
    tabs: [
      destination('/habits', 'Today', 'heart-pulse', { exact: true }),
      destination('/habits?view=plan', 'Plan', 'list-checks', { activeIncludes: 'view=plan' }),
      destination('/habits?view=history', 'History', 'calendar-days', { activeIncludes: 'view=history' }),
      destination('/habits?view=insights', 'Insights', 'bar-chart-3', { activeIncludes: 'view=insights' }),
    ],
  },
  {
    id: 'money',
    label: 'Money',
    subtitle: 'Finance',
    icon: 'wallet',
    root: '/finance',
    tone: 'money',
    matches: ['/finance'],
    tabs: [
      destination('/finance', 'Summary', 'layout-dashboard', { exact: true }),
      destination('/finance/transactions', 'Transactions', 'receipt'),
    ],
  },
  {
    id: 'music',
    label: 'Music',
    subtitle: 'Spotify',
    icon: 'music',
    root: '/spotify/personal',
    tone: 'music',
    matches: ['/spotify'],
    tabs: [
      destination('/spotify/personal', 'Personal', 'user'),
      destination('/spotify/ranking', 'Ranking', 'trophy'),
      destination('/spotify/global', 'Global', 'globe'),
    ],
  },
  {
    id: 'media',
    label: 'Media',
    subtitle: 'Library',
    icon: 'clapperboard',
    root: '/media',
    tone: 'media',
    matches: ['/media'],
    tabs: [
      destination('/home', 'Today', 'home', { exact: true }),
      destination('/menu', 'Apps', 'grid-3x3'),
      destination('/media', 'Library', 'library', { exact: true }),
    ],
  },
  {
    id: 'assistant',
    label: 'Assistant',
    subtitle: 'AI copilot',
    icon: 'message-square',
    root: '/chat',
    tone: 'ai',
    matches: ['/chat'],
    tabs: [
      destination('/home', 'Today', 'home', { exact: true }),
      destination('/menu', 'Apps', 'grid-3x3'),
      destination('/chat', 'Assistant', 'message-square', { exact: true }),
    ],
  },
]

export function getNativeAppForPath(path) {
  const pathname = normalizePath(path)
  if (isSettingsDataRoute(pathname)) {
    return NATIVE_SETTINGS_APP
  }
  if (pathname.startsWith('/settings')) {
    return NATIVE_SETTINGS_APP
  }
  return (
    NATIVE_APPS.find((app) => app.matches.some((prefix) => pathname.startsWith(prefix))) ||
    NATIVE_APPS[0]
  )
}

function isTabEnabled(tab, prefs) {
  if (!tab.module || prefs == null) return true
  return isNativeAppEnabled({ id: tab.module }, prefs)
}

export function getNativeTabsForPath(path, prefs) {
  const app = getNativeAppForPath(path)
  if (!isNativeAppEnabled(app, prefs)) return []
  return (app.tabs || []).filter((tab) => isTabEnabled(tab, prefs))
}

export function getNativeAppSwitcherOptions(path, prefs) {
  const currentApp = getNativeAppForPath(path)
  return filterEnabledNativeApps(NATIVE_APPS, prefs).filter((app) => app.id !== currentApp.id)
}

export function isNativeDestinationActive(tab, pathname, search = '') {
  const currentPath = normalizePath(pathname)
  const current = `${currentPath}${search || ''}`
  const targetPath = normalizePath(tab.to)
  if (tab.dataHub && isSettingsDataRoute(currentPath)) return true
  if (tab.activeIncludes) return current.includes(tab.activeIncludes)
  if (tab.exact) return current === tab.to || (currentPath === targetPath && !search && !tab.to.includes('?'))
  return currentPath.startsWith(targetPath)
}

export function getNativeBackDestination(path, search = '') {
  const pathname = normalizePath(path)
  const embeddedQuery = String(path || '').includes('?')
    ? `?${String(path).split('?').slice(1).join('?')}`
    : ''
  const query = String(search || embeddedQuery || '')

  if (pathname === '/home' || pathname === '/login' || pathname === '/register') {
    return null
  }

  if (pathname === '/settings') {
    return query.includes('section=') ? '/settings' : '/home'
  }

  if (pathname === '/menu' || pathname === '/chat') {
    return '/home'
  }

  if (pathname.startsWith('/finance/') && pathname !== '/finance') {
    return '/finance'
  }
  if (pathname.startsWith('/workout/') && pathname !== '/workout') {
    return '/workout'
  }
  if (pathname === '/habits' && query) {
    return '/habits'
  }
  if (pathname.startsWith('/habits/') && pathname !== '/habits') {
    return '/habits'
  }
  if (pathname.startsWith('/spotify/') && pathname !== '/spotify/personal') {
    return '/spotify/personal'
  }
  if (pathname.startsWith('/media/') && pathname !== '/media') {
    return '/media'
  }

  return '/home'
}
