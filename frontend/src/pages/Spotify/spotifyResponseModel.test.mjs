import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeListeningCollection } from './spotifyResponseModel.mjs'

test('normalizes transient and paginated listening responses before rendering', () => {
  const row = { id: 'one' }
  assert.deepEqual(normalizeListeningCollection([row]), [row])
  assert.deepEqual(normalizeListeningCollection({ items: [row] }), [row])
  assert.deepEqual(normalizeListeningCollection({ data: [row] }), [row])
  assert.deepEqual(normalizeListeningCollection({ message: 'temporarily unavailable' }), [])
  assert.deepEqual(normalizeListeningCollection(null), [])
})
