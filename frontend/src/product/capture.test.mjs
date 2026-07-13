import test from 'node:test'
import assert from 'node:assert/strict'

import { getCaptureActions } from './capture.mjs'

test('capture actions respect enabled modules and keep recent action stable', () => {
  const actions = getCaptureActions({
    enabled: ['finance', 'training'],
    recent: ['transaction'],
  })

  assert.deepEqual(actions.map((item) => item.id), [
    'transaction',
    'workout',
    'bodyweight',
    'note',
  ])
})

test('capture excludes actions owned by disabled modules', () => {
  const actions = getCaptureActions({ enabled: ['habits'], recent: [] })

  assert.deepEqual(actions.map((item) => item.id), ['habit', 'note'])
})
