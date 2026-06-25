const injectedVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''
const injectedBuildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : ''

export const APP_VERSION = injectedVersion || '0.0.0'
export const APP_BUILD_TIME = injectedBuildTime || null

export function normalizeAppVersion(version) {
  return String(version || '')
    .trim()
    .replace(/^android-v/i, '')
    .replace(/^v/i, '')
    .split(/[+-]/)[0]
}

function parseComparableVersion(version) {
  const normalized = normalizeAppVersion(version)
  if (!/^\d+(?:\.\d+){0,3}$/.test(normalized)) return null
  return normalized.split('.').map((part) => Number(part))
}

export function compareAppVersions(left, right) {
  const leftParts = parseComparableVersion(left)
  const rightParts = parseComparableVersion(right)
  if (!leftParts || !rightParts) return null

  const length = Math.max(leftParts.length, rightParts.length)
  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] || 0
    const rightValue = rightParts[index] || 0
    if (leftValue > rightValue) return 1
    if (leftValue < rightValue) return -1
  }
  return 0
}

export function getReleaseVersionStatus(releaseVersion, currentVersion = APP_VERSION) {
  const comparison = compareAppVersions(releaseVersion, currentVersion)
  if (comparison == null) return 'unknown'
  if (comparison > 0) return 'newer'
  if (comparison < 0) return 'older'
  return 'current'
}

export function formatBuildTime(value = APP_BUILD_TIME) {
  if (!value) return 'local build'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'local build'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
