import { ANDROID_APK_URL, isNativeMobileApp } from './mobilePlatform.js'
import { APP_VERSION, getReleaseVersionStatus } from './appVersion.mjs'
import { getApiBase } from './config.js'

const RELEASE_API_URL = 'https://api.github.com/repos/Adrian-Luerssen/Personal-Server/releases/latest'
const VERSION_POLICY_URL = '/app/versions/status'
const LAST_CHECK_KEY = 'personal-server:update:last-check'
const DISMISSED_KEY = 'personal-server:update:dismissed-id'
const SEEN_VERSION_KEY = 'personal-server:update:seen-version'
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

function getStorage(storage) {
  if (storage) return storage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

function normalizeChangelog(changelog = {}) {
  return {
    summary: changelog.summary || '',
    features: Array.isArray(changelog.features) ? changelog.features : [],
    fixes: Array.isArray(changelog.fixes) ? changelog.fixes : [],
    technical: Array.isArray(changelog.technical) ? changelog.technical : [],
    commits: Array.isArray(changelog.commits) ? changelog.commits : [],
    compareUrl: changelog.compareUrl || '',
  }
}

export function normalizeVersionPolicy(policy) {
  if (!policy?.latest) return null
  const latest = policy.latest
  const version = latest.releaseTag || `android-v${latest.version}`
  return {
    id: latest.id || latest.releaseTag || latest.version,
    version,
    currentVersion: policy.installedVersion || APP_VERSION,
    versionStatus: policy.updateRequired ? 'required' : 'newer',
    required: policy.updateRequired === true,
    reason: policy.reason || '',
    name: latest.releaseName || `Personal Server Android v${latest.version}`,
    publishedAt: latest.publishedAt,
    apkUrl: latest.apkUrl || ANDROID_APK_URL,
    changelog: normalizeChangelog(policy.changelog || latest.changelog),
    installedRelease: policy.installed || null,
    rawPolicy: policy,
  }
}

export function readSeenAppVersion(storage = undefined) {
  return getStorage(storage)?.getItem(SEEN_VERSION_KEY) || ''
}

export function writeSeenAppVersion(storage = undefined, version = APP_VERSION) {
  getStorage(storage)?.setItem(SEEN_VERSION_KEY, String(version || APP_VERSION))
}

export function buildInstalledVersionAnnouncement({
  currentVersion = APP_VERSION,
  installedRelease,
  storage = undefined,
} = {}) {
  if (!installedRelease?.version) return null
  if (readSeenAppVersion(storage) === currentVersion) return null
  const changelog = normalizeChangelog(installedRelease.changelog)
  const hasDetails =
    changelog.summary ||
    changelog.features.length ||
    changelog.fixes.length ||
    changelog.technical.length
  if (!hasDetails) return null
  return {
    version: installedRelease.version,
    changelog,
  }
}

export async function getAndroidVersionPolicy({ installedVersion = APP_VERSION } = {}) {
  try {
    const base = getApiBase().replace(/\/$/, '')
    const params = new URLSearchParams({
      platform: 'android',
      installedVersion,
    })
    const response = await fetch(`${base}${VERSION_POLICY_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export async function checkForAndroidUpdate({ force = false } = {}) {
  if (!isNativeMobileApp()) return null

  const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) || 0)
  if (!force && Date.now() - lastCheck < CHECK_INTERVAL_MS) return null

  localStorage.setItem(LAST_CHECK_KEY, String(Date.now()))

  const policy = await getAndroidVersionPolicy()
  const policyUpdate = normalizeVersionPolicy(policy)
  if (policyUpdate?.rawPolicy?.updateAvailable) {
    const updateId = String(policyUpdate.id || policyUpdate.version || '')
    if (policyUpdate.required || localStorage.getItem(DISMISSED_KEY) !== updateId) {
      return policyUpdate
    }
  }

  try {
    const response = await fetch(RELEASE_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) return null

    const release = await response.json()
    const asset = Array.isArray(release.assets)
      ? release.assets.find((item) => /\.apk$/i.test(item.name || ''))
      : null
    const updateId = String(asset?.id || release.id || release.tag_name || release.published_at || '')
    if (!updateId || localStorage.getItem(DISMISSED_KEY) === updateId) return null
    const versionStatus = getReleaseVersionStatus(release.tag_name, APP_VERSION)
    if (versionStatus === 'current' || versionStatus === 'older') return null

    return {
      id: updateId,
      version: release.tag_name || 'latest',
      currentVersion: APP_VERSION,
      versionStatus,
      required: false,
      name: release.name || 'Android update',
      publishedAt: release.published_at,
      apkUrl: asset?.browser_download_url || ANDROID_APK_URL,
      changelog: normalizeChangelog({
        summary: release.name || '',
        technical: release.body ? [release.body] : [],
      }),
    }
  } catch {
    return null
  }
}

export function dismissAndroidUpdate(updateId) {
  if (updateId) localStorage.setItem(DISMISSED_KEY, String(updateId))
}

export function getUpdaterPlugin() {
  return window.Capacitor?.Plugins?.PersonalServerUpdater || null
}

export async function installAndroidUpdate(update) {
  const apkUrl = update?.apkUrl || ANDROID_APK_URL
  const plugin = getUpdaterPlugin()
  if (plugin?.installUpdate) {
    return plugin.installUpdate({
      url: apkUrl,
      fileName: `personal-server-${String(update?.version || 'latest').replace(/^android-v/i, '')}.apk`,
    })
  }
  if (typeof window !== 'undefined') {
    window.location.href = apkUrl
  }
  return { started: false, redirected: true }
}
