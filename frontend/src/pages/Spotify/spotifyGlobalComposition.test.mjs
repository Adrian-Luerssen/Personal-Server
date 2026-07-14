import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./SpotifyGlobal.jsx', import.meta.url), 'utf8')

test('global listening uses the Record register language', () => {
  assert.match(source, /PageHeading/)
  assert.match(source, /SummaryStrip/)
  assert.match(source, /RegisterRow/)
  assert.match(source, /Aggregated listening/)
  assert.doesNotMatch(source, /PodiumCard|StatCard|style=\{\{/)
})

test('global rankings render available track, album, and artist artwork', () => {
  assert.match(source, /getListeningArtworkUrl/)
  assert.match(source, /record-music-global__artwork/)
  assert.match(source, /<img[^>]+src=\{identity\.artwork\}/)
  assert.match(source, /loading="lazy"/)
})
