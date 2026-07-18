import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('native update prompt is a bounded optional bottom sheet', () => {
  const component = read('./components/NativeUpdateGate.jsx')
  const css = read('./record.css')

  assert.match(component, /A new version is ready/)
  assert.match(component, /<details className="native-update-changelog">/)
  assert.match(component, />\s*Not now\s*</)
  assert.doesNotMatch(component, /No user-facing feature entries were detected/)
  assert.match(css, /\.native-update-gate\s*\{[^}]*position:\s*fixed[^}]*align-items:\s*flex-end/s)
  assert.match(css, /\.native-update-gate__panel\s*\{[^}]*max-height:\s*min\(78dvh, 620px\)[^}]*overflow:\s*auto/s)
  assert.match(css, /\.native-update-gate__actions\s*\{[^}]*position:\s*sticky/s)
})
