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

function cleanMarkdownText(value = '') {
  return String(value)
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeHeading(value = '') {
  return cleanMarkdownText(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function sectionForHeading(heading) {
  const normalized = normalizeHeading(heading)
  if (/^(new|new and improved|features|improvements|added)$/.test(normalized)) return 'features'
  if (/^(fixed|fixes|bug fixes|resolved)$/.test(normalized)) return 'fixes'
  if (/^(technical|technical changes|verification|build|deployment)$/.test(normalized)) return 'technical'
  if (/^(commits|commit list)$/.test(normalized)) return 'commits'
  return ''
}

function addUniqueItem(target, value) {
  const item = cleanMarkdownText(value)
  if (item && !target.includes(item)) target.push(item)
}

function fallbackReleaseBodyItems(body = '') {
  return String(body)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^#{1,6}\s+/.test(line))
    .filter((line) => !/^\|.*\|$/.test(line))
    .filter((line) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, ''))
    .map(cleanMarkdownText)
    .filter(Boolean)
    .slice(0, 6)
}

export function parseAndroidReleaseNotes(body = '', fallbackSummary = '') {
  const changelog = {
    summary: cleanMarkdownText(fallbackSummary),
    features: [],
    fixes: [],
    technical: [],
    commits: [],
    compareUrl: '',
  }
  if (!body) return normalizeChangelog(changelog)

  const compareMatch = String(body).match(/\[compare changes]\(([^)]+)\)/i)
  if (compareMatch?.[1]) changelog.compareUrl = compareMatch[1]

  let currentSection = ''
  let insideActualChangelog = false

  for (const rawLine of String(body).split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const headingMatch = line.match(/^(#{2,6})\s+(.+?)\s*$/)
    if (headingMatch) {
      const heading = headingMatch[2]
      const normalized = normalizeHeading(heading)
      if (normalized === 'changelog') {
        insideActualChangelog = true
        currentSection = ''
        continue
      }
      currentSection = insideActualChangelog ? sectionForHeading(heading) : ''
      continue
    }

    if (!insideActualChangelog) continue

    if (!changelog.summary && /^changes since\b/i.test(line)) {
      changelog.summary = cleanMarkdownText(line)
      continue
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/)
    if (!bulletMatch || !currentSection) continue

    if (currentSection === 'commits') {
      const commitMatch = bulletMatch[1].match(/^`?([a-f0-9]{7,40})`?\s+(.+)$/i)
      const subject = commitMatch ? cleanMarkdownText(commitMatch[2]) : cleanMarkdownText(bulletMatch[1])
      if (subject) changelog.commits.push(subject)
      continue
    }

    addUniqueItem(changelog[currentSection], bulletMatch[1])
  }

  if (!changelog.summary) {
    changelog.summary =
      changelog.features[0] ||
      changelog.fixes[0] ||
      changelog.technical[0] ||
      cleanMarkdownText(fallbackSummary)
  }

  const hasStructuredItems =
    changelog.features.length ||
    changelog.fixes.length ||
    changelog.technical.length ||
    changelog.commits.length

  if (!hasStructuredItems) {
    changelog.technical = fallbackReleaseBodyItems(body)
  }

  return normalizeChangelog(changelog)
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
    name: latest.releaseName || `Record Android v${latest.version}`,
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
      changelog: parseAndroidReleaseNotes(release.body || '', release.name || 'Android update'),
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
