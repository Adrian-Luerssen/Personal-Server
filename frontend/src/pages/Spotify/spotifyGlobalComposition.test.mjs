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
