import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const media = await readFile(new URL('./Media.jsx', import.meta.url), 'utf8')
const detail = await readFile(new URL('./SeriesDetail.jsx', import.meta.url), 'utf8')

test('Series is a season-aware library rather than a generic media dashboard', () => {
  assert.match(media, /<PageHeading/)
  assert.match(media, /<SummaryStrip/)
  assert.match(media, /className="record-series-filters"/)
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
})

test('Series creation and editing do not use blocking browser alerts or confirmations', () => {
  assert.doesNotMatch(media, /\balert\(/)
  assert.doesNotMatch(media, /\bconfirm\(/)
  assert.match(media, /role="alert"/)
  assert.match(media, /deleteConfirm/)
})
