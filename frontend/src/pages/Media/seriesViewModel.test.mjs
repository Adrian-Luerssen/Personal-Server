import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getNextProgressUpdate,
  groupSeriesByStatus,
  normalizeSeriesCollection,
  paginateSeriesLibrary,
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

test('media pagination keeps status order and reports full group counts', () => {
  const items = [
    { id: 'done-1', status: 'completed' },
    { id: 'plan-1', status: 'planning' },
    { id: 'watch-1', status: 'watching' },
    { id: 'watch-2', status: 'watching' },
    { id: 'watch-3', status: 'watching' },
  ]

  const first = paginateSeriesLibrary(items, 1, 2)
  assert.deepEqual(first.groups.map(group => ({
    status: group.status,
    ids: group.items.map(item => item.id),
    totalCount: group.totalCount,
  })), [{ status: 'watching', ids: ['watch-1', 'watch-2'], totalCount: 3 }])
  assert.deepEqual(first, {
    ...first,
    page: 1,
    pageSize: 2,
    totalItems: 5,
    totalPages: 3,
    start: 1,
    end: 2,
  })

  const last = paginateSeriesLibrary(items, 99, 2)
  assert.equal(last.page, 3)
  assert.deepEqual(last.groups.map(group => group.status), ['completed'])
  assert.deepEqual(last.groups[0].items.map(item => item.id), ['done-1'])
})
