const LOCAL_DELIVERED_KEY = 'personal-server-ai-notifications-delivered'

function getStorage(storage) {
  if (storage) return storage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

function readDeliveredIds(storage) {
  const raw = storage?.getItem(LOCAL_DELIVERED_KEY)
  if (!raw) return new Set()
  try {
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeDeliveredIds(storage, ids) {
  storage?.setItem(LOCAL_DELIVERED_KEY, JSON.stringify([...ids].slice(-100)))
}

function isEnabled(storage, key, defaultEnabled = true) {
  const value = storage?.getItem(key)
  if (value == null) return defaultEnabled
  return value === 'true'
}

async function getDefaultApiClient() {
  const mod = await import('./api.js')
  return mod.api
}

async function getDefaultDeliverNotification() {
  const mod = await import('./notifications.js')
  return mod.deliverCustomNotification
}

export function createNotificationScheduleId(id) {
  const source = String(id || '')
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0
  }
  return 520000 + (Math.abs(hash) % 1_500_000_000)
}

export function areAiCustomNotificationsEnabled(storage = getStorage()) {
  return (
    isEnabled(storage, 'notify:assistant', true) &&
    isEnabled(storage, 'notify:assistant-custom', true)
  )
}

export async function pollPendingAiNotifications(options = {}) {
  const storage = getStorage(options.storage)
  const apiClient = options.apiClient || await getDefaultApiClient()
  const deliverNotification = options.deliverNotification || await getDefaultDeliverNotification()
  const limit = options.limit || 10
  const notifications = await apiClient.get(`/notifications/pending?limit=${limit}`)
  const deliveredIds = readDeliveredIds(storage)
  const enabled = areAiCustomNotificationsEnabled(storage)
  const result = { delivered: 0, skipped: 0, failed: 0 }

  for (const notification of Array.isArray(notifications) ? notifications : []) {
    if (!notification?.id) {
      result.skipped += 1
      continue
    }

    if (deliveredIds.has(notification.id)) {
      await apiClient.patch(`/notifications/${notification.id}/delivered`, {}).catch(() => {})
      result.skipped += 1
      continue
    }

    if (!enabled) {
      result.skipped += 1
      continue
    }

    const delivered = await deliverNotification({
      ...notification,
      nativeId: createNotificationScheduleId(notification.id),
    })

    if (!delivered) {
      result.failed += 1
      continue
    }

    deliveredIds.add(notification.id)
    writeDeliveredIds(storage, deliveredIds)
    await apiClient.patch(`/notifications/${notification.id}/delivered`, {})
    result.delivered += 1
  }

  return result
}
