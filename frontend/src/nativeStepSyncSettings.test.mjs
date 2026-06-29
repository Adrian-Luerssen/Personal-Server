import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const settingsPath = resolve(process.cwd(), 'src/pages/Settings/Settings.jsx')
const settingsSource = readFileSync(settingsPath, 'utf8')

test('native health settings expose separate live and background step sync controls', () => {
  assert.match(settingsSource, /Live in-app steps/)
  assert.match(settingsSource, /Background step sync/)
  assert.match(settingsSource, /configureNativeStepSync/)
  assert.match(settingsSource, /readStepSyncPreferences/)
  assert.match(settingsSource, /writeStepSyncPreferences/)
})
