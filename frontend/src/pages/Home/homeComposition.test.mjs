import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const source = readFileSync(resolve(process.cwd(), 'src/pages/Home.jsx'), 'utf8')

test('Today is composed as an open-record register instead of a dashboard card wall', () => {
  assert.match(source, /<PageHeading/)
  assert.match(source, /<SummaryStrip/)
  assert.match(source, /<Register[^>]+title="Open records"/)
  assert.match(source, /Nothing needs review/)
  assert.match(source, /data-testid="today-open-register"/)
  assert.doesNotMatch(source, /DailyBrief|ActionTimeline|StatCard|SignalRing/)
})

test('Today actions remain direct and source-aware', () => {
  assert.match(source, /Review detected payment/)
  assert.match(source, /Continue active workout/)
  assert.match(source, /Mark .* done/)
  assert.match(source, /Last checked/)
  assert.match(source, /Ask from records/)
})

test('web Today reads the authoritative Spotify today total', () => {
  assert.match(source, /\/streams\/stats\?timeframe=today/)
  assert.match(source, /todayStreams:\s*data\.spotify\.totalStreams/)
  assert.doesNotMatch(source, /\['spotify',[\s\S]*\/streams\/stats\?timeframe=all/)
})
