import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyEpisodeWatchOverrides,
  buildContinuity,
  formatEpisodeCode,
  getCatalogProgressLabel,
  getContinuityTarget,
  getNextEpisodeAction,
  getSeasonEpisodeOverrides,
  getSeriesRowAction,
  isSeriesAiring,
  summarizeSeriesMetadata,
} from './seriesCatalogModel.mjs'

test('keeps every pending episode toggle when an older server snapshot arrives', () => {
  const catalog = {
    seasons: [{
      id: 'season-1',
      number: 1,
      episodes: [
        { id: 'episode-1', watched: true },
        { id: 'episode-2', watched: false },
        { id: 'episode-3', watched: false },
      ],
    }],
    progress: { watched: 1, total: 3 },
  }

  const merged = applyEpisodeWatchOverrides(catalog, new Map([
    ['episode-2', true],
    ['episode-3', true],
  ]))

  assert.deepEqual(
    merged.seasons[0].episodes.map(episode => episode.watched),
    [true, true, true],
  )
  assert.equal(merged.progress.watched, 3)
  assert.equal(catalog.seasons[0].episodes[1].watched, false)
})

test('builds one optimistic override for every episode in a season', () => {
  assert.deepEqual(
    [...getSeasonEpisodeOverrides({
      episodes: [{ id: 'episode-1' }, { id: 'episode-2' }],
    }, true)],
    [['episode-1', true], ['episode-2', true]],
  )
})

test('formats concrete season and episode positions', () => {
  assert.equal(formatEpisodeCode({ seasonNumber: 3, number: 7 }), 'S03E07')
  assert.equal(formatEpisodeCode({ seasonNumber: 0, number: 2 }), 'Special 2')
})

test('completed titles ask for a score instead of offering another episode', () => {
  assert.deepEqual(getSeriesRowAction({ status: 'completed', rating: 8 }, { nextEpisode: { id: 'ep' } }), {
    kind: 'score', label: '8.0 / 10', needsScore: false,
  })
  assert.deepEqual(getSeriesRowAction({ status: 'completed', rating: null }, { nextEpisode: { id: 'ep' } }), {
    kind: 'score', label: 'Add score', needsScore: true,
  })
})

test('recognizes active provider statuses across MAL, AniList, and TMDB', () => {
  for (const status of ['Currently Airing', 'RELEASING', 'Returning Series', 'In Production']) {
    assert.equal(isSeriesAiring({ metadata: { airingStatus: status } }), true)
  }
  assert.equal(isSeriesAiring({ metadata: { airingStatus: 'Finished Airing' } }), false)
})

test('describes structured progress before falling back to aggregate counts', () => {
  const catalog = {
    progress: { watched: 18, total: 30, seasonNumber: 2, episodeNumber: 6 },
  }
  assert.equal(getCatalogProgressLabel(catalog, {}), 'S02E06 · 18 of 30 watched')
  assert.equal(getCatalogProgressLabel(null, { metadata: { episodesWatched: 8, episodes: 12 } }), '8 of 12 episodes')
})

test('describes movies without inventing episode progress', () => {
  const movie = { type: 'movie', status: 'completed', metadata: { year: 2016 } }
  assert.equal(getCatalogProgressLabel(null, movie), 'Watched')
  assert.equal(summarizeSeriesMetadata(movie).format, 'Movie')
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

test('routes tracked continuity locally and untracked releases through a MAL preview', () => {
  assert.deepEqual(getContinuityTarget({ mediaItemId: 'local-2', malId: 22 }), {
    kind: 'library', id: 'local-2',
  })
  assert.deepEqual(getContinuityTarget({ mediaItemId: null, malId: 33 }), {
    kind: 'provider', malId: 33,
  })
  assert.equal(getContinuityTarget({ mediaItemId: null, malId: null }), null)
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
      releaseStartDate: '2026-01-10',
      releaseEndDate: '2026-03-28',
    },
  }), {
    year: 2026,
    format: 'TV',
    airingStatus: 'Currently Airing',
    studio: 'Bones',
    genres: ['Action', 'Drama'],
    providerScore: 8.5,
    synopsis: 'Story',
    releaseStartDate: '2026-01-10',
    releaseEndDate: '2026-03-28',
  })
})
