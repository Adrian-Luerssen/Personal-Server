import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./Landing.jsx', import.meta.url), 'utf8')

test('landing presents Record as one coherent private record system', () => {
  assert.match(source, /Keep the life you live useful/)
  assert.match(source, /landing-record-preview/)
  assert.match(source, /Your records stay legible/)
  assert.match(source, /Managed service/)
  assert.match(source, /Self-hosted/)
  assert.doesNotMatch(source, /data-tone=/)
  assert.doesNotMatch(source, /Landing\.css/)
  assert.doesNotMatch(source, /Everything you are/)
})

test('landing preview is a truthful register rather than a fake dashboard', () => {
  assert.match(source, /Open records/)
  assert.match(source, /Review detected payment/)
  assert.match(source, /Continue S02E04/)
  assert.doesNotMatch(source, /landing-stage-metric/)
})
