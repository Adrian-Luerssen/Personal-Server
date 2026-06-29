import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function readAndroidFile(relativePath) {
  return readFileSync(new URL(`../android/app/src/main/${relativePath}`, import.meta.url), 'utf8')
}

describe('Android Health Connect integration', () => {
  it('declares the Health Connect permission rationale and Android 14 permission usage entry points', () => {
    const manifest = readAndroidFile('AndroidManifest.xml')

    assert.match(manifest, /androidx\.health\.ACTION_SHOW_PERMISSIONS_RATIONALE/)
    assert.match(manifest, /android\.intent\.action\.VIEW_PERMISSION_USAGE/)
    assert.match(manifest, /android\.intent\.category\.HEALTH_PERMISSIONS/)
    assert.match(manifest, /android\.permission\.START_VIEW_PERMISSION_USAGE/)
  })

  it('declares both legacy and framework Health Connect onboarding entry points', () => {
    const manifest = readAndroidFile('AndroidManifest.xml')

    assert.match(manifest, /androidx\.health\.ACTION_SHOW_ONBOARDING/)
    assert.match(manifest, /android\.health\.connect\.action\.SHOW_ONBOARDING/)
    assert.match(manifest, /com\.google\.android\.apps\.healthdata\.permission\.START_ONBOARDING/)
    assert.match(manifest, /android\.permission\.health\.START_ONBOARDING/)
  })

  it('keeps step and exact-alarm permissions declared for native notifications and steps', () => {
    const manifest = readAndroidFile('AndroidManifest.xml')

    assert.match(manifest, /android\.permission\.POST_NOTIFICATIONS/)
    assert.match(manifest, /android\.permission\.SCHEDULE_EXACT_ALARM/)
    assert.match(manifest, /android\.permission\.USE_EXACT_ALARM/)
    assert.match(manifest, /android\.permission\.health\.READ_STEPS/)
  })
})
