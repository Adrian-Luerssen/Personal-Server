import { ANDROID_APK_URL, isNativeMobileApp } from './mobilePlatform'

const RELEASE_API_URL = 'https://api.github.com/repos/Adrian-Luerssen/Personal-Server/releases/latest'
const LAST_CHECK_KEY = 'personal-server:update:last-check'
const DISMISSED_KEY = 'personal-server:update:dismissed-id'
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

export async function checkForAndroidUpdate({ force = false } = {}) {
  if (!isNativeMobileApp()) return null

  const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) || 0)
  if (!force && Date.now() - lastCheck < CHECK_INTERVAL_MS) return null

  localStorage.setItem(LAST_CHECK_KEY, String(Date.now()))

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

    return {
      id: updateId,
      version: release.tag_name || 'latest',
      name: release.name || 'Android update',
      publishedAt: release.published_at,
      apkUrl: asset?.browser_download_url || ANDROID_APK_URL,
    }
  } catch {
    return null
  }
}

export function dismissAndroidUpdate(updateId) {
  if (updateId) localStorage.setItem(DISMISSED_KEY, String(updateId))
}
