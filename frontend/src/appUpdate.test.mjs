import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildInstalledVersionAnnouncement,
  normalizeVersionPolicy,
  parseAndroidReleaseNotes,
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

test('parseAndroidReleaseNotes extracts readable changelog sections from generated release notes', () => {
  const releaseBody = `## Personal Server Android APK

### Deployment
| Field | Value |
| --- | --- |
| Channel | Versioned Android APK release |
| App version | \`0.0.1.20\` |
| Workflow run | [#20](https://github.com/Adrian-Luerssen/Personal-Server/actions/runs/20) |

### APK Asset
| Field | Value |
| --- | --- |
| File | \`personal-server.apk\` |
| SHA-256 | \`abc123\` |

### Verification
- Vite production build completed.

### Changelog
Changes since android-v0.0.1.19: [compare changes](https://github.com/Adrian-Luerssen/Personal-Server/compare/android-v0.0.1.19...d5dbaca)

#### New and improved
- Install APK updates in-app.
- Show the changelog after update.

#### Fixed
- Keep required updates locked.

#### Technical
- API cache and app version tests passed.
- Gradle assembleRelease completed.

#### Commits
- \`d5dbaca\` feat: improve Android update flow

### Install
Download \`personal-server.apk\` from the release assets.
`

  const changelog = parseAndroidReleaseNotes(releaseBody, 'Personal Server Android v0.0.1.20')

  assert.equal(changelog.summary, 'Personal Server Android v0.0.1.20')
  assert.deepEqual(changelog.features, ['Install APK updates in-app.', 'Show the changelog after update.'])
  assert.deepEqual(changelog.fixes, ['Keep required updates locked.'])
  assert.deepEqual(changelog.technical, ['API cache and app version tests passed.', 'Gradle assembleRelease completed.'])
  assert.deepEqual(changelog.commits, ['feat: improve Android update flow'])
  assert.equal(
    changelog.compareUrl,
    'https://github.com/Adrian-Luerssen/Personal-Server/compare/android-v0.0.1.19...d5dbaca',
  )
  assert.equal(changelog.technical.some((item) => item.includes('| Field | Value |')), false)
})
