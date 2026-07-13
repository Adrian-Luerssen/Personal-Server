import test from 'node:test'
import assert from 'node:assert/strict'

import { buildTodayBrief, buildTodayItems } from './todayModel.mjs'

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

test('daily brief reports source records without fabricating a life score', () => {
  const brief = buildTodayBrief({
    activeWorkout: { id: 'w1', name: 'Upper body' },
    habitsCompleted: 3,
    habitsTotal: 5,
    paymentSuggestions: [{ id: 'p1', status: 'pending' }],
    spentToday: 42.3,
    streamsToday: 18,
    steps: 6421,
  })

  assert.equal(brief.openCount, 3)
  assert.equal(brief.primary.kind, 'payment-review')
  assert.equal(brief.primary.label, 'Review a detected payment')
  assert.deepEqual(brief.facts, {
    habits: { completed: 3, total: 5 },
    cash: { spentToday: 42.3 },
    movement: { steps: 6421 },
    music: { streamsToday: 18 },
  })
  assert.equal('score' in brief, false)
  assert.equal('signal' in brief, false)
})

test('daily brief prefers an active workout when no payment needs review', () => {
  const brief = buildTodayBrief({
    activeWorkout: { id: 'w1', name: 'Upper body' },
    habitsCompleted: 2,
    habitsTotal: 2,
  })

  assert.deepEqual(brief.primary, {
    kind: 'active-workout',
    label: 'Continue Upper body',
    to: '/workout/active',
  })
  assert.equal(brief.openCount, 1)
})
