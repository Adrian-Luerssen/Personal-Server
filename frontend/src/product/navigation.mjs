export const GLOBAL_DESTINATIONS = Object.freeze([
  Object.freeze({ id: 'today', label: 'Today', to: '/home', icon: 'home' }),
  Object.freeze({ id: 'records', label: 'Records', to: '/menu', icon: 'library' }),
  Object.freeze({ id: 'capture', label: 'Capture', icon: 'plus', action: 'capture' }),
  Object.freeze({ id: 'assistant', label: 'Assistant', to: '/chat', icon: 'message-square' }),
  Object.freeze({ id: 'you', label: 'You', to: '/settings', icon: 'user' }),
])

const DOMAIN_NAVIGATION = Object.freeze({
  gym: Object.freeze([
    { label: 'Today', to: '/workout', exact: true },
    { label: 'Active', to: '/workout/active' },
    { label: 'History', to: '/workout/history' },
    { label: 'Exercises', to: '/workout/exercises' },
    { label: 'Progress', to: '/workout/bodyweight' },
  ]),
  habits: Object.freeze([
    { label: 'Today', to: '/habits', exact: true },
    { label: 'Plan', to: '/habits?view=plan', activeIncludes: 'view=plan' },
    { label: 'History', to: '/habits?view=history', activeIncludes: 'view=history' },
    { label: 'Insights', to: '/habits?view=insights', activeIncludes: 'view=insights' },
  ]),
  cash: Object.freeze([
    { label: 'Ledger', to: '/finance/transactions', exact: true },
    { label: 'Budgets', to: '/finance/budgets' },
    { label: 'Analysis', to: '/finance/trends' },
  ]),
  spotify: Object.freeze([
    { label: 'Personal', to: '/spotify/personal' },
    { label: 'Ranking', to: '/spotify/ranking' },
    { label: 'Global', to: '/spotify/global' },
  ]),
  series: Object.freeze([
    { label: 'My list', to: '/media', exact: true },
    { label: 'Discover', to: '/media?view=discover', activeIncludes: 'view=discover' },
  ]),
})

export function getDomainId(pathname) {
  const path = String(pathname || '').split('?')[0]
  if (path.startsWith('/workout')) return 'gym'
  if (path.startsWith('/habits')) return 'habits'
  if (path.startsWith('/finance')) return 'cash'
  if (path.startsWith('/spotify')) return 'spotify'
  if (path.startsWith('/media')) return 'series'
  return null
}

export function getDomainNavigation(pathname) {
  const domainId = getDomainId(pathname)
  return domainId ? DOMAIN_NAVIGATION[domainId] : []
}
