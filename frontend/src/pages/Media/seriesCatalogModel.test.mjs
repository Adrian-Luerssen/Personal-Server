import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildContinuity,
  formatEpisodeCode,
  getCatalogProgressLabel,
  getNextEpisodeAction,
  summarizeSeriesMetadata,
} from './seriesCatalogModel.mjs'

test('formats concrete season and episode positions', () => {
  assert.equal(formatEpisodeCode({ seasonNumber: 3, number: 7 }), 'S03E07')
  assert.equal(formatEpisodeCode({ seasonNumber: 0, number: 2 }), 'Special 2')
})

test('describes structured progress before falling back to aggregate counts', () => {
  const catalog = {
    progress: { watched: 18, total: 30, seasonNumber: 2, episodeNumber: 6 },
  }
  assert.equal(getCatalogProgressLabel(catalog, {}), 'S02E06 · 18 of 30 watched')
  assert.equal(getCatalogProgressLabel(null, { metadata: { episodesWatched: 8, episodes: 12 } }), '8 of 12 episodes')
})

test('builds a useful next episode action and identifies upcoming episodes', () => {
  assert.deepEqual(getNextEpisodeAction({
    nextEpisode: { id: 'ep-8', seasonNumber: 2, number: 7, title: 'A New Start' },
  }), {
    episodeId: 'ep-8',
    label: 'Watch S02E07',
    detail: 'A New Start',
    upcoming: false,
  })
  assert.equal(getNextEpisodeAction({ nextEpisode: null, upcomingEpisode: { id: 'future', seasonNumber: 2, number: 8, title: 'Soon', airDate: '2027-01-01' } }).upcoming, true)
})

test('orders anime continuity around the current MAL release', () => {
  const current = { id: 'current', title: 'Season 2', externalIds: { malId: 20 } }
  const relations = [
    { id: 'sequel', relationType: 'sequel', targetTitle: 'Season 3', targetMalId: 30 },
    { id: 'side', relationType: 'side_story', targetTitle: 'OVA', targetMalId: 25 },
    { id: 'prequel', relationType: 'prequel', targetTitle: 'Season 1', targetMalId: 10 },
  ]

  assert.deepEqual(
    buildContinuity(current, relations).map((entry) => [entry.position, entry.title]),
    [['before', 'Season 1'], ['current', 'Season 2'], ['after', 'Season 3'], ['related', 'OVA']],
  )
})

test('surfaces provider metadata without leaking opaque fields', () => {
  assert.deepEqual(summarizeSeriesMetadata({
    metadata: {
      year: 2026,
      mediaFormat: 'TV',
      airingStatus: 'Currently Airing',
      studios: ['Bones'],
      genres: ['Action', 'Drama'],
      malScore: 8.45,
      synopsis: 'Story',
    },
  }), {
    year: 2026,
    format: 'TV',
    airingStatus: 'Currently Airing',
    studio: 'Bones',
    genres: ['Action', 'Drama'],
    providerScore: 8.5,
    synopsis: 'Story',
  })
})
