const UNIT_BY_CADENCE = Object.freeze({
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
})

export function formatCadenceStreak({ cadence = 'daily', count = 0 } = {}) {
  const unit = UNIT_BY_CADENCE[cadence] || UNIT_BY_CADENCE.daily
  return `${count} fulfilled ${unit}${count === 1 ? '' : 's'}`
}

export function applyHabitStatus(habit, status) {
  return {
    current: { ...habit, status },
    undo: { ...habit },
  }
}
