import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compareAppVersions,
  getReleaseVersionStatus,
  normalizeAppVersion,
} from './appVersion.mjs'

test('normalizes release and Android version tags', () => {
  assert.equal(normalizeAppVersion('v1.2.3'), '1.2.3')
  assert.equal(normalizeAppVersion('android-v1.2.3'), '1.2.3')
  assert.equal(normalizeAppVersion('1.2.3+42'), '1.2.3')
})

test('compares semantic app versions by numeric segment', () => {
  assert.equal(compareAppVersions('1.2.10', '1.2.9'), 1)
  assert.equal(compareAppVersions('1.2.0', '1.2'), 0)
  assert.equal(compareAppVersions('1.2.0', '1.3.0'), -1)
})

test('classifies latest release status against installed version', () => {
  assert.equal(getReleaseVersionStatus('android-v1.0.1', '1.0.0'), 'newer')
  assert.equal(getReleaseVersionStatus('android-v1.0.0', '1.0.0'), 'current')
  assert.equal(getReleaseVersionStatus('android-v0.9.9', '1.0.0'), 'older')
  assert.equal(getReleaseVersionStatus('android-latest', '1.0.0'), 'unknown')
})
