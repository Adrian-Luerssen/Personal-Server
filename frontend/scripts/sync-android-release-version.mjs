import { readFileSync } from 'node:fs'

const apiBase = process.env.VITE_API_BASE?.replace(/\/$/, '')
const secret = process.env.APP_RELEASE_SYNC_SECRET

if (!apiBase) {
  throw new Error('VITE_API_BASE is required to sync app version metadata')
}

if (!secret) {
  console.log('APP_RELEASE_SYNC_SECRET is not configured; skipping backend app version sync.')
  process.exit(0)
}

const metadata = JSON.parse(readFileSync('personal-server-release.json', 'utf8'))
const response = await fetch(`${apiBase}/app/versions/release`, {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-app-release-secret': secret,
  },
  body: JSON.stringify({
    platform: 'android',
    version: metadata.version || metadata.appVersion,
    versionCode: metadata.versionCode,
    releaseTag: metadata.releaseTag,
    releaseName: metadata.releaseName,
    apkUrl: metadata.apkUrl,
    minimumSupportedVersion: metadata.minimumSupportedVersion,
    required: metadata.required === true,
    changelog: metadata.changelog,
    publishedAt: metadata.publishedAt,
  }),
})

if (!response.ok) {
  const body = await response.text().catch(() => '')
  throw new Error(`Failed to sync app version metadata: HTTP ${response.status} ${body}`)
}

const saved = await response.json()
console.log(`Synced Android app version ${saved.version || metadata.version} to backend policy DB.`)
