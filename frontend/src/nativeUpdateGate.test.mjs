import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('optional updates use a compact notice while required updates keep the blocking gate', () => {
  const component = read('./components/NativeUpdateGate.jsx')
  const css = read('./record.css')

  assert.match(component, /A new version is ready/)
  assert.match(component, /<details className="native-update-changelog">/)
  assert.match(component, /native-update-notice/)
  assert.match(component, /update\.required\s*\?\s*\(/)
  assert.match(component, /aria-modal="true"/)
  assert.doesNotMatch(component, /No user-facing feature entries were detected/)
  assert.match(css, /\.native-update-notice\s*\{[^}]*position:\s*fixed/s)
  assert.doesNotMatch(css, /\.native-update-notice\s*\{[^}]*inset:\s*0/s)
  assert.match(css, /\.native-update-gate\s*\{[^}]*position:\s*fixed[^}]*align-items:\s*flex-end/s)
  assert.match(css, /\.native-update-gate__panel\s*\{[^}]*max-height:\s*min\(78dvh, 620px\)[^}]*overflow:\s*auto/s)
  assert.match(css, /\.native-update-gate__actions\s*\{[^}]*position:\s*sticky/s)
})
