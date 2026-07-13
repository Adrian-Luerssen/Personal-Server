import test from 'node:test'
import assert from 'node:assert/strict'

import { buildTodayItems } from './todayModel.mjs'

test('unresolved records and active work appear before passive summaries', () => {
  const items = buildTodayItems({
    activeWorkout: { id: 'w1' },
    habitsDue: [{ id: 'h1' }],
    paymentSuggestions: [{ id: 'p1', status: 'pending' }],
    recentStreams: [{ id: 's1' }],
  })

  assert.deepEqual(items.map((item) => item.kind), [
    'payment-review',
    'active-workout',
    'habit-due',
    'recent-stream',
  ])
})

test('resolved payment suggestions are excluded from the actionable timeline', () => {
  const items = buildTodayItems({
    paymentSuggestions: [
      { id: 'p1', status: 'confirmed' },
      { id: 'p2', status: 'ignored' },
    ],
  })

  assert.deepEqual(items, [])
})
