import test from 'node:test'
import assert from 'node:assert/strict'

import { completeSetOptimistically, createNextSet } from './workoutViewModel.mjs'

test('new set copies the latest completed weight and reps', () => {
  const next = createNextSet([{ weight: 80, reps: 8, completed: true }])
  assert.deepEqual(next, { weight: 80, reps: 8, completed: false, kind: 'working' })
})

test('new set ignores an unfinished draft when choosing defaults', () => {
  const next = createNextSet([
    { weight: 70, reps: 10, completed: true },
    { weight: 100, reps: 1, completed: false },
  ])
  assert.deepEqual(next, { weight: 70, reps: 10, completed: false, kind: 'working' })
})

test('optimistic completion preserves an undo snapshot', () => {
  const result = completeSetOptimistically({ id: 's1', completed: false })
  assert.equal(result.current.completed, true)
  assert.equal(result.undo.completed, false)
})
