import { getEnabledPreloadPaths } from './modulePreferences.mjs'

const ROUTE_PRELOADS = Object.freeze({
  home: [
    '/dashboard/mobile',
    '/dashboard/intelligence',
    '/habits/summary',
    '/workout/sessions/active',
    '/finance/transactions/summary',
    '/finance/transaction-suggestions',
    '/streams/stats?timeframe=today',
  ],
  finance: [
    '/finance/wallets',
    '/finance/categories',
    '/finance/subscriptions',
    '/finance/transaction-suggestions',
    '/finance/transactions/summary',
  ],
  workout: [
    '/workout/sessions/active',
    '/workout/sessions/recent',
    '/workout/sessions?page=1&limit=20',
    '/workout/bodyweight',
    '/workout/exercises',
    '/workout/sessions/prs',
  ],
  habits: [
    '/habits',
    '/habits/summary',
  ],
  music: [
    '/spotify/linked',
    '/spotify/me',
    '/streams/stats?timeframe=all',
    '/streams/history?page=1&pageSize=10',
    '/streams/top?platform=spotify&limit=10&type=track',
    '/albums/top-albums?platform=spotify&limit=10',
    '/artists/top-artists?platform=spotify&limit=10',
    '/playlists/top-playlists?platform=spotify&limit=10',
  ],
  media: [
    '/media',
    '/media/stats',
    '/media/catalog/summaries',
  ],
})

function routeGroup(pathname = '/') {
  const path = String(pathname || '/').split('?')[0]
  if (path === '/' || path.startsWith('/home')) return 'home'
  if (path.startsWith('/finance')) return 'finance'
  if (path.startsWith('/workout')) return 'workout'
  if (path.startsWith('/habits')) return 'habits'
  if (path.startsWith('/spotify') || path.startsWith('/streams')) return 'music'
  if (path.startsWith('/media')) return 'media'
  return null
}

function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function withDynamicPaths(group, paths, now) {
  if (group !== 'habits') return paths
  const month = currentMonthKey(now)
  return [
    ...paths,
    `/habits/calendar/${month}`,
    `/habits/progress/${month}`,
  ]
}

export function getPreloadPathsForRoute(pathname, prefs, now = new Date()) {
  const group = routeGroup(pathname)
  if (!group) return []
  const paths = withDynamicPaths(group, ROUTE_PRELOADS[group], now)
  return getEnabledPreloadPaths(paths, prefs)
}

export function getAllEnabledPreloadPaths(prefs, now = new Date()) {
  const paths = Object.entries(ROUTE_PRELOADS)
    .flatMap(([group, entries]) => withDynamicPaths(group, entries, now))
  return [...new Set(getEnabledPreloadPaths(paths, prefs))]
}

export { ROUTE_PRELOADS }
