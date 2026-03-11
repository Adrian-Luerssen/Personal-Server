import { useLocation } from 'react-router-dom'

const PAGE_TYPES = {
  '/home': 'dashboard',
  '/workout': 'workout-overview',
  '/workout/history': 'workout-history',
  '/workout/exercises': 'workout-exercises',
  '/workout/bodyweight': 'workout-bodyweight',
  '/workout/active': 'workout-active',
  '/workout/import': 'workout-import',
  '/finance': 'finance-overview',
  '/finance/transactions': 'finance-transactions',
  '/finance/settings': 'finance-settings',
  '/finance/import': 'finance-import',
  '/habits': 'habits',
  '/habits/settings': 'habits-settings',
  '/spotify/personal': 'spotify-personal',
  '/settings': 'settings',
  '/profile': 'profile',
}

export function usePageContext(extra = {}) {
  const location = useLocation()
  const route = location.pathname
  const pageType = PAGE_TYPES[route] || 'unknown'
  const params = Object.fromEntries(new URLSearchParams(location.search))

  return { route, pageType, filters: params, ...extra }
}
