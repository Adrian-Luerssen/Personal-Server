const PRIORITY = Object.freeze({
  'payment-review': 10,
  'active-workout': 20,
  'habit-due': 30,
  'recent-stream': 90,
})

function timestampFor(record) {
  return record?.occurredAt || record?.updatedAt || record?.createdAt || null
}

export function buildTodayItems({
  activeWorkout = null,
  habitsDue = [],
  paymentSuggestions = [],
  recentStreams = [],
} = {}) {
  const items = []

  for (const suggestion of paymentSuggestions.filter((item) => item?.status === 'pending')) {
    items.push({
      id: `payment-${suggestion.id}`,
      kind: 'payment-review',
      label: suggestion.merchant ? `Review ${suggestion.merchant}` : 'Review detected payment',
      detail: suggestion.amountFormatted || suggestion.amount || null,
      to: '/finance/transactions?review=pending',
      timestamp: timestampFor(suggestion),
    })
  }

  if (activeWorkout?.id) {
    items.push({
      id: `workout-${activeWorkout.id}`,
      kind: 'active-workout',
      label: activeWorkout.name || 'Continue active workout',
      detail: activeWorkout.exerciseCount ? `${activeWorkout.exerciseCount} exercises` : null,
      to: '/workout/active',
      timestamp: timestampFor(activeWorkout),
    })
  }

  for (const habit of habitsDue) {
    items.push({
      id: `habit-${habit.id}`,
      kind: 'habit-due',
      label: habit.name || habit.title || 'Habit due',
      detail: habit.cadenceLabel || null,
      to: '/habits',
      timestamp: timestampFor(habit),
    })
  }

  for (const stream of recentStreams) {
    items.push({
      id: `stream-${stream.id}`,
      kind: 'recent-stream',
      label: stream.trackName || stream.name || 'Recently played',
      detail: stream.artistName || stream.artist || null,
      to: '/spotify/personal',
      timestamp: timestampFor(stream),
    })
  }

  return items.sort((left, right) => {
    const priorityDelta = PRIORITY[left.kind] - PRIORITY[right.kind]
    if (priorityDelta !== 0) return priorityDelta
    return String(right.timestamp || '').localeCompare(String(left.timestamp || ''))
  })
}
