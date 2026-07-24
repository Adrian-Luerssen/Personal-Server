import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const media = await readFile(new URL('./Media.jsx', import.meta.url), 'utf8')
const detail = await readFile(new URL('./SeriesDetail.jsx', import.meta.url), 'utf8')

test('Series is a season-aware library rather than a generic media dashboard', () => {
  assert.match(media, /<PageHeading/)
  assert.match(media, /<SummaryStrip/)
  assert.match(media, /record-series-filters/)
  assert.match(media, /FilterContainer = nativeApp \? 'details' : 'section'/)
  assert.match(media, /series-row__scope/)
  assert.match(media, /related release/)
  assert.match(media, /season/)
  assert.doesNotMatch(media, /Media\.css/)
  assert.doesNotMatch(media, /style=\{filterType === key \? \{ background: meta\.color/)
})

test('Series detail exposes TV seasons and anime continuity as different structures', () => {
  assert.match(detail, /item\.type === 'tv'/)
  assert.match(detail, /<SeriesSeasonList/)
  assert.match(detail, /item\.type === 'anime'/)
  assert.match(detail, /<AnimeContinuity/)
  assert.match(detail, /series-detail__progress/)
  assert.match(detail, /aria-label="Your rating"/)
  assert.match(detail, /Release dates/)
  assert.match(detail, /onOpenRelated/)
  assert.match(detail, /Add to library/)
})

test('Series creation and editing do not use blocking browser alerts or confirmations', () => {
  assert.doesNotMatch(media, /\balert\(/)
  assert.doesNotMatch(media, /\bconfirm\(/)
  assert.match(media, /role="alert"/)
  assert.match(media, /deleteConfirm/)
})

test('every catalog creation path exposes a status choice before saving', async () => {
  const discover = await readFile(new URL('./MediaDiscover.jsx', import.meta.url), 'utf8')
  const statusModel = await readFile(new URL('./mediaStatusModel.mjs', import.meta.url), 'utf8')

  assert.match(media, /Status for \$\{item\.title\}/)
  assert.match(discover, /Status for \$\{result\.title\}/)
  assert.match(detail, /Status for new title/)
  assert.doesNotMatch(discover, /Add to Planning/)
  assert.match(statusModel, /classifications\.includes\('movie'\)/)
})

test('series filtering and labels use classification facets instead of only primary type', () => {
  assert.match(media, /params\.set\('tag', filterType\)/)
  assert.match(media, /getMediaClassificationLabel\(item\)/)
  assert.match(media, /stats\?\.byTag\?\.\[key\]/)
})
