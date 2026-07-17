import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const settings = await readFile(new URL('./Settings.jsx', import.meta.url), 'utf8')
const appearance = await readFile(new URL('./Appearance.jsx', import.meta.url), 'utf8')

test('desktop Settings uses a stable index and detail workspace', () => {
  assert.match(settings, /<PageHeading/)
  assert.match(settings, /className="record-settings-workspace"/)
  assert.match(settings, /className="record-settings-nav"/)
  assert.match(settings, /className="record-settings-content"/)
  assert.match(settings, /setSearchParams\(\{ tab/)
  assert.doesNotMatch(settings, /<PageHeader/)
})

test('appearance protects the Record identity from per-page theme drift', () => {
  assert.match(appearance, /Record identity/)
  assert.match(appearance, /Density/)
  assert.doesNotMatch(appearance, /PRESET_COLORS|GRADIENT_DIRECTIONS|customCss|background image/i)
})

test('Settings exposes catalog recovery only inside role-gated admin access', () => {
  assert.match(settings, /accountRole === 'admin'/)
  assert.match(settings, /Sync remaining shows/)
  assert.match(settings, /\/media\/catalog\/sync-remaining/)
  assert.match(settings, /activeTab === 'admin'/)
  assert.match(settings, /activeSection === 'admin'/)
})
