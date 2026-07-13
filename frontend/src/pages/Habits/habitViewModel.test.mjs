import test from 'node:test'
import assert from 'node:assert/strict'

import { applyHabitStatus, formatCadenceStreak } from './habitViewModel.mjs'

test('weekly streaks name fulfilled weeks', () => {
  assert.equal(formatCadenceStreak({ cadence: 'weekly', count: 4 }), '4 fulfilled weeks')
})

test('singular cadence labels remain grammatical', () => {
  assert.equal(formatCadenceStreak({ cadence: 'monthly', count: 1 }), '1 fulfilled month')
})

test('status changes retain the prior state for undo', () => {
  const result = applyHabitStatus({ status: 'none' }, 'success')
  assert.equal(result.current.status, 'success')
  assert.equal(result.undo.status, 'none')
})
