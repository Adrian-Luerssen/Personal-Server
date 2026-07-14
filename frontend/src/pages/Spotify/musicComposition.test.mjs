import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('./SpotifyPersonal.jsx', import.meta.url), 'utf8')

test('Music is composed as a listening record instead of a generic statistics dashboard', () => {
  assert.match(source, /<PageHeading/)
  assert.match(source, /className="record-music-profile"/)
  assert.match(source, /className="record-music-period"/)
  assert.match(source, /className="record-music-rankings"/)
  assert.match(source, /Listening pattern/)
  assert.doesNotMatch(source, /<PageHeader/)
  assert.doesNotMatch(source, /<StatCard/)
  assert.doesNotMatch(source, /General Statistics/)
})

test('Music keeps one shared period control for every insight', () => {
  assert.equal((source.match(/TIMEFRAMES\.map/g) || []).length, 1)
  assert.match(source, /aria-label="Listening period"/)
})
