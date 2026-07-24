import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getMediaClassificationLabel,
  getMediaClassifications,
  getMediaStatusOptions,
  normalizeMediaStatus,
} from './mediaStatusModel.mjs'

test('movies never expose watching or reading as tracking statuses', () => {
  const values = getMediaStatusOptions('movie').map(option => option.value)

  assert.deepEqual(values, ['planning', 'completed', 'paused', 'dropped'])
})

test('rating a movie completes it while an unrated watching movie returns to planning', () => {
  assert.equal(normalizeMediaStatus('movie', 'planning', 8.5), 'completed')
  assert.equal(normalizeMediaStatus('movie', 'watching', ''), 'planning')
  assert.equal(normalizeMediaStatus('tv', 'watching', ''), 'watching')
})

test('anime movies expose both classifications and use movie statuses', () => {
  const item = {
    type: 'anime',
    metadata: { mediaFormat: 'Movie', tags: ['anime', 'tv'] },
  }

  assert.deepEqual(getMediaClassifications(item), ['anime', 'movie'])
  assert.equal(getMediaClassificationLabel(item), 'Anime \u00b7 Movie')
  assert.deepEqual(
    getMediaStatusOptions(item.type, item.metadata).map(option => option.value),
    ['planning', 'completed', 'paused', 'dropped'],
  )
  assert.equal(
    normalizeMediaStatus(item.type, 'watching', 8.5, item.metadata),
    'completed',
  )
})
