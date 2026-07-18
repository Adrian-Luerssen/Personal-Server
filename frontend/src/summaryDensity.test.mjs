import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('top-level mobile summaries use the compact shared ledger', () => {
  const bodyweight = read('./pages/Workout/WorkoutBodyweight.jsx')
  const ranking = read('./pages/Spotify/SpotifyRanking.jsx')
  const summary = read('./components/record/SummaryStrip.jsx')

  assert.match(bodyweight, /<SummaryStrip[^>]+Bodyweight summary/)
  assert.match(ranking, /<SummaryStrip[^>]+Listening ranking summary/)
  assert.doesNotMatch(bodyweight, /<StatCard/)
  assert.doesNotMatch(ranking, /<StatCard/)
  assert.match(summary, /\.\.\.props/)
  assert.match(summary, /data-count=\{React\.Children\.count\(children\)\}/)
})

test('mobile summary grids keep complete rows compact', () => {
  const css = read('./record.css')

  assert.match(css, /\.record-summary__item:nth-child\(odd\)[^{]*\{[^}]*border-right:/s)
  assert.match(css, /\.record-summary__item:nth-last-child\(-n \+ 2\)[^{]*\{[^}]*border-bottom:\s*0/s)
  assert.match(css, /\.record-summary__item:last-child:nth-child\(odd\)[^{]*\{[^}]*grid-column:\s*1 \/ -1/s)
  assert.match(css, /\.record-summary\[data-count="3"\][^{]*\{[^}]*grid-template-columns:\s*repeat\(3,/s)
  assert.match(css, /\.record-summary\[data-count="3"\] \.record-summary__item:last-child[^{]*\{[^}]*grid-column:\s*auto/s)
})
