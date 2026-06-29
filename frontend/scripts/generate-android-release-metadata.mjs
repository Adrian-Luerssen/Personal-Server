import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

function env(name, fallback = '') {
  return process.env[name] || fallback
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function listPreviousAndroidTag(releaseTag) {
  const tags = git(['tag', '--list', 'android-v*', '--sort=-creatordate'])
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter(Boolean)
  return tags.find((tag) => tag !== releaseTag) || ''
}

function parseCommits(raw) {
  return raw
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash = '', shortHash = '', subject = '', ...bodyParts] = entry.split('\x1f')
      return {
        hash,
        shortHash,
        subject,
        body: bodyParts.join('\x1f').trim(),
      }
    })
}

function readCommits(previousTag, commit) {
  const format = '%H%x1f%h%x1f%s%x1f%b%x1e'
  if (previousTag) {
    return parseCommits(git(['log', '--no-merges', `--pretty=format:${format}`, `${previousTag}..${commit}`]))
  }
  return parseCommits(git(['log', '--no-merges', '-20', `--pretty=format:${format}`, commit]))
}

function stripConventionalPrefix(subject) {
  return subject.replace(/^(feat|fix|build|ci|chore|docs|refactor|test|perf|style)(\([^)]+\))?:\s*/i, '')
}

function bulletLines(commit) {
  const bodyBullets = commit.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean)
  return bodyBullets.length > 0 ? bodyBullets : [stripConventionalPrefix(commit.subject)]
}

function addUnique(target, value) {
  if (value && !target.includes(value)) target.push(value)
}

function buildChangelog(commits, previousTag, range, compareUrl) {
  const features = []
  const fixes = []
  const technical = []

  for (const commit of commits) {
    const subject = commit.subject.toLowerCase()
    const lines = bulletLines(commit)
    for (const line of lines) {
      const lowered = line.toLowerCase()
      if (subject.startsWith('fix:') || /^(fix|correct|repair|prevent|resolve)\b/i.test(line)) {
        addUnique(fixes, line)
      } else if (
        subject.startsWith('feat:') ||
        /^(add|create|implement|install|surface|show|display|route|make|sync|generate|expose)\b/i.test(line)
      ) {
        addUnique(features, line)
      } else if (
        /^(build|ci|chore|docs|refactor|test|perf|style):/.test(subject) ||
        /^(test|build|compile|verify|workflow|release|cache|migrate)\b/i.test(line)
      ) {
        addUnique(technical, line)
      } else {
        addUnique(features, line)
      }
    }
  }

  return {
    summary: features[0] || fixes[0] || technical[0] || 'Android app maintenance release',
    features,
    fixes,
    technical,
    commits,
    previousAndroidTag: previousTag || null,
    range,
    compareUrl,
  }
}

function markdownList(items, fallback) {
  if (!items.length) return `- ${fallback}`
  return items.map((item) => `- ${item}`).join('\n')
}

const appVersion = env('APP_VERSION')
const appBaseVersion = env('APP_BASE_VERSION')
const appBuildTime = env('APP_BUILD_TIME')
const releaseTag = env('RELEASE_TAG')
const releaseCommit = env('RELEASE_COMMIT')
const releaseRef = env('RELEASE_REF')
const releaseRefType = env('RELEASE_REF_TYPE')
const releaseRepository = env('RELEASE_REPOSITORY')
const releaseRunId = env('RELEASE_RUN_ID')
const releaseRunNumber = env('RELEASE_RUN_NUMBER')
const apkSha256 = env('APK_SHA256')
const apkSizeBytes = Number(env('APK_SIZE_BYTES', '0'))
const apkSizeMb = env('APK_SIZE_MB')
const releaseChannel = 'Versioned Android APK release'
const minSupportedVersion = env('ANDROID_MIN_SUPPORTED_VERSION', '0.0.0')

const previousTag = listPreviousAndroidTag(releaseTag)
const releaseCommitShort = releaseCommit.slice(0, 7)
const commitUrl = `https://github.com/${releaseRepository}/commit/${releaseCommit}`
const runUrl = `https://github.com/${releaseRepository}/actions/runs/${releaseRunId}`
const compareUrl = previousTag
  ? `https://github.com/${releaseRepository}/compare/${previousTag}...${releaseCommit}`
  : commitUrl
const range = previousTag ? `${previousTag}..${releaseCommit}` : `initial:${releaseCommit}`
const commits = readCommits(previousTag, releaseCommit)
const changelog = buildChangelog(commits, previousTag, range, compareUrl)
const releaseName = `Personal Server Android v${appVersion}`
const apkUrl = `https://github.com/${releaseRepository}/releases/download/${releaseTag}/personal-server.apk`

const notes = `## Personal Server Android APK

### Deployment
| Field | Value |
| --- | --- |
| Channel | ${releaseChannel} |
| App version | \`${appVersion}\` |
| Base app version | \`${appBaseVersion}\` |
| Minimum supported version | \`${minSupportedVersion}\` |
| Android versionCode | \`${releaseRunNumber}\` |
| Build time | \`${appBuildTime}\` |
| Release tag | \`${releaseTag}\` |
| Source ref | \`${releaseRefType}:${releaseRef}\` |
| Commit | [\`${releaseCommitShort}\`](${commitUrl}) |
| Workflow run | [#${releaseRunNumber}](${runUrl}) |
| API target | \`VITE_API_BASE\` repository secret, validated as public HTTPS |

### APK Asset
| Field | Value |
| --- | --- |
| File | \`personal-server.apk\` |
| Size | \`${apkSizeMb} MB\` |
| SHA-256 | \`${apkSha256}\` |
| Signing | Signed release APK verified with Android \`apksigner\` |

### Verification
- API cache and app version tests passed.
- Mobile shell and mobile landing gate Playwright tests passed.
- Vite production build completed.
- Capacitor Android project sync completed.
- Gradle \`assembleRelease\` completed.

### Changelog
${previousTag ? `Changes since ${previousTag}` : 'Initial Android release changelog'}: [compare changes](${compareUrl})

#### New and improved
${markdownList(changelog.features, 'No user-facing feature entries were detected in commit bodies.')}

#### Fixed
${markdownList(changelog.fixes, 'No fix entries were detected in commit bodies.')}

#### Technical
${markdownList(changelog.technical, 'No technical entries were detected in commit bodies.')}

#### Commits
${commits.map((commit) => `- \`${commit.shortHash}\` ${commit.subject}`).join('\n') || `- \`${releaseCommitShort}\` ${stripConventionalPrefix(env('COMMIT_SUBJECT'))}`}

### Install
Download \`personal-server.apk\` from the release assets and install it on Android. If Android blocks the install, allow installs from your browser or file manager for this APK.
`

const metadata = {
  platform: 'android',
  appVersion,
  version: appVersion,
  baseAppVersion: appBaseVersion,
  androidVersionCode: releaseRunNumber,
  versionCode: Number(releaseRunNumber),
  buildTime: appBuildTime,
  releaseTag,
  releaseName,
  releaseChannel,
  sourceRef: `${releaseRefType}:${releaseRef}`,
  commit: releaseCommit,
  workflowRun: runUrl,
  apkUrl,
  minimumSupportedVersion: minSupportedVersion,
  required: false,
  publishedAt: new Date().toISOString(),
  changelog,
  apk: {
    file: 'personal-server.apk',
    sizeBytes: apkSizeBytes,
    sha256: apkSha256,
    signed: true,
  },
  verification: [
    'api-cache-and-version-tests',
    'mobile-shell-playwright-tests',
    'vite-production-build',
    'capacitor-android-sync',
    'gradle-assemble-release',
    'apksigner-verify',
  ],
}

writeFileSync('release-notes.md', notes)
writeFileSync('personal-server-release.json', `${JSON.stringify(metadata, null, 2)}\n`)
