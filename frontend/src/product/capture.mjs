const CAPTURE_ACTIONS = Object.freeze([
  Object.freeze({ id: 'transaction', label: 'Transaction', module: 'finance', to: '/finance/transactions?capture=new', icon: 'receipt' }),
  Object.freeze({ id: 'workout', label: 'Start workout', module: 'training', to: '/workout', icon: 'dumbbell' }),
  Object.freeze({ id: 'bodyweight', label: 'Bodyweight', module: 'training', to: '/workout/bodyweight?capture=new', icon: 'scale' }),
  Object.freeze({ id: 'habit', label: 'Habit entry', module: 'habits', to: '/habits', icon: 'check' }),
  Object.freeze({ id: 'series', label: 'Series progress', module: 'media', to: '/media', icon: 'clapperboard' }),
  Object.freeze({ id: 'note', label: 'Quick note', module: null, to: '/chat?capture=note', icon: 'notebook-pen' }),
])

export function getCaptureActions({ enabled = [], recent = [] } = {}) {
  const enabledSet = new Set(enabled)
  const recentOrder = new Map(recent.map((id, index) => [id, index]))

  return CAPTURE_ACTIONS
    .filter((action) => !action.module || enabledSet.has(action.module))
    .map((action, index) => ({ action, index }))
    .sort((left, right) => {
      const leftRecent = recentOrder.has(left.action.id) ? recentOrder.get(left.action.id) : Number.POSITIVE_INFINITY
      const rightRecent = recentOrder.has(right.action.id) ? recentOrder.get(right.action.id) : Number.POSITIVE_INFINITY
      return leftRecent - rightRecent || left.index - right.index
    })
    .map(({ action }) => action)
}
