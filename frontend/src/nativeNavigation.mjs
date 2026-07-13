import { filterEnabledNativeApps } from './modulePreferences.mjs'

function normalizePath(path) {
  return String(path || '/').split('?')[0]
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
  label: 'You',
  subtitle: 'Account and app',
  icon: 'settings',
  root: '/settings',
  tone: 'info',
  matches: ['/settings'],
  tabs: [],
}

export const NATIVE_APPS = [
  {
    id: 'overview',
    label: 'Today',
    subtitle: 'Daily record',
    icon: 'layout-dashboard',
    root: '/home',
    tone: 'info',
    matches: ['/home', '/menu'],
    tabs: [],
  },
  {
    id: 'training',
    label: 'Gym',
    subtitle: 'Training record',
    icon: 'dumbbell',
    root: '/workout',
    tone: 'success',
    matches: ['/workout'],
    tabs: [],
  },
  {
    id: 'habits',
    label: 'Habits',
    subtitle: 'Daily routines',
    icon: 'heart-pulse',
    root: '/habits',
    tone: 'habits',
    matches: ['/habits'],
    tabs: [],
  },
  {
    id: 'money',
    label: 'Cash',
    subtitle: 'Ledger and budgets',
    icon: 'wallet',
    root: '/finance',
    tone: 'money',
    matches: ['/finance'],
    tabs: [],
  },
  {
    id: 'music',
    label: 'Spotify',
    subtitle: 'Listening record',
    icon: 'music',
    root: '/spotify/personal',
    tone: 'music',
    matches: ['/spotify'],
    tabs: [],
  },
  {
    id: 'media',
    label: 'Series',
    subtitle: 'Watch list',
    icon: 'clapperboard',
    root: '/media',
    tone: 'media',
    matches: ['/media'],
    tabs: [],
  },
  {
    id: 'assistant',
    label: 'Assistant',
    subtitle: 'Across your records',
    icon: 'message-square',
    root: '/chat',
    tone: 'ai',
    matches: ['/chat'],
    tabs: [],
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

export function getNativeTabsForPath() {
  return []
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
