import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildInstalledVersionAnnouncement,
  normalizeVersionPolicy,
  readSeenAppVersion,
  writeSeenAppVersion,
} from './appUpdate.js'

test('normalizeVersionPolicy turns backend version policy into update state', () => {
  const policy = normalizeVersionPolicy({
    platform: 'android',
    installedVersion: '0.0.1.17',
    updateAvailable: true,
    updateRequired: true,
    reason: 'below-minimum-supported-version',
    latest: {
      version: '0.0.1.20',
      releaseTag: 'android-v0.0.1.20',
      releaseName: 'Personal Server Android v0.0.1.20',
      apkUrl: 'https://example.com/app.apk',
      changelog: {
        summary: 'Native app maintenance',
        features: ['Install APK updates in-app'],
      },
    },
  })

  assert.equal(policy.version, 'android-v0.0.1.20')
  assert.equal(policy.required, true)
  assert.equal(policy.reason, 'below-minimum-supported-version')
  assert.deepEqual(policy.changelog.features, ['Install APK updates in-app'])
  assert.equal(policy.apkUrl, 'https://example.com/app.apk')
})

test('installed version announcement is shown once per installed version with changelog details', () => {
  const storage = new Map()
  const localStorageLike = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  }

  const installedRelease = {
    version: '0.0.1.20',
    changelog: {
      summary: 'Native app maintenance',
      features: ['Install APK updates in-app'],
      fixes: ['Keep required updates locked'],
    },
  }

  assert.equal(readSeenAppVersion(localStorageLike), '')
  assert.deepEqual(
    buildInstalledVersionAnnouncement({
      currentVersion: '0.0.1.20',
      installedRelease,
      storage: localStorageLike,
    }),
    {
      version: '0.0.1.20',
      changelog: {
        summary: 'Native app maintenance',
        features: ['Install APK updates in-app'],
        fixes: ['Keep required updates locked'],
        technical: [],
        commits: [],
        compareUrl: '',
      },
    },
  )

  writeSeenAppVersion(localStorageLike, '0.0.1.20')
  assert.equal(
    buildInstalledVersionAnnouncement({
      currentVersion: '0.0.1.20',
      installedRelease,
      storage: localStorageLike,
    }),
    null,
  )
})
