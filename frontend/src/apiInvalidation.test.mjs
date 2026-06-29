import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const apiSource = readFileSync(new URL('./api.js', import.meta.url), 'utf8')

test('activity mutations invalidate dashboard cache because Today depends on step counts', () => {
  assert.match(apiSource, /dashboardPrefixes[\s\S]*'\/activity'/)
})
