import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getNextProgressUpdate,
  groupSeriesByStatus,
  normalizeSeriesCollection,
} from './seriesViewModel.mjs'

test('normalizes both array and paginated series responses', () => {
  const item = { id: 'one', title: 'One' }
  assert.deepEqual(normalizeSeriesCollection([item]), [item])
  assert.deepEqual(normalizeSeriesCollection({ items: [item], total: 1 }), [item])
  assert.deepEqual(normalizeSeriesCollection(null), [])
})

test('episode increments stop at the source total and only suggest completion', () => {
  const item = {
    type: 'anime',
    status: 'watching',
    metadata: { episodesWatched: 11, episodes: 12 },
  }

  assert.deepEqual(getNextProgressUpdate(item), {
    field: 'episodesWatched',
    value: 12,
    total: 12,
    unit: 'episode',
    completionSuggested: true,
  })
  assert.equal(getNextProgressUpdate({ ...item, metadata: { episodesWatched: 12, episodes: 12 } }), null)
  assert.equal(item.status, 'watching')
})

test('series are grouped in action-first status order', () => {
  const groups = groupSeriesByStatus([
    { id: 'done', status: 'completed' },
    { id: 'later', status: 'planning' },
    { id: 'now', status: 'watching' },
    { id: 'paused', status: 'paused' },
  ])

  assert.deepEqual(groups.map(({ status }) => status), ['watching', 'paused', 'planning', 'completed'])
})
