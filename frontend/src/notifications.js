import { isNativeMobileApp } from './mobilePlatform'
import {
  isPromptableNotificationPermission,
  normalizeNativeNotificationCapability,
} from './notificationPermission.mjs'

export const REMINDER_NOTIFICATION_CHANNEL_ID = 'personal-server-reminders'
export const AI_NOTIFICATION_CHANNEL_ID = 'personal-server-ai'

async function getLocalNotifications() {
  if (!isNativeMobileApp()) return null
  const nativePlugin = window.Capacitor?.Plugins?.LocalNotifications
  if (nativePlugin) return nativePlugin
  try {
    const mod = await import('@capacitor/local-notifications')
    return mod.LocalNotifications
  } catch {
    return null
  }
}

export async function requestNotificationPermission() {
  const LocalNotifications = await getLocalNotifications()
  if (!LocalNotifications) return false

  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') {
    await ensureReminderNotificationChannel(LocalNotifications)
    await ensureAiNotificationChannel(LocalNotifications)
    return areNotificationsEnabled(LocalNotifications)
  }

  const requested = await LocalNotifications.requestPermissions()
  if (requested.display !== 'granted') return false

  await ensureReminderNotificationChannel(LocalNotifications)
  await ensureAiNotificationChannel(LocalNotifications)
  return areNotificationsEnabled(LocalNotifications)
}

export async function getNotificationPermissionStatus() {
  const LocalNotifications = await getLocalNotifications()
  if (!LocalNotifications) return 'unsupported'

  try {
    const current = await LocalNotifications.checkPermissions()
    return current.display || 'prompt'
  } catch {
    return 'unsupported'
  }
}

export async function initializeNativeNotifications({ requestIfPrompt = true } = {}) {
  const LocalNotifications = await getLocalNotifications()
  if (!LocalNotifications) return { supported: false, permission: 'unsupported' }

  try {
    const current = await LocalNotifications.checkPermissions()
    let permission = current.display || 'prompt'

    if (requestIfPrompt && isPromptableNotificationPermission(permission)) {
      const requested = await LocalNotifications.requestPermissions()
      permission = requested.display || permission
    }

    if (permission === 'granted') {
      await ensureReminderNotificationChannel(LocalNotifications)
      await ensureAiNotificationChannel(LocalNotifications)
    }

    const enabled = await areNotificationsEnabled(LocalNotifications)
    const exact = await getExactNotificationSetting(LocalNotifications)
    const capability = normalizeNativeNotificationCapability({ permission, enabled, exact })
    return { supported: true, ...capability }
  } catch {
    return { supported: false, permission: 'unsupported' }
  }
}

export async function getNativeNotificationStatus() {
  const LocalNotifications = await getLocalNotifications()
  if (!LocalNotifications) {
    return { supported: false, ...normalizeNativeNotificationCapability() }
  }

  try {
    const current = await LocalNotifications.checkPermissions()
    const enabled = await areNotificationsEnabled(LocalNotifications)
    const exact = await getExactNotificationSetting(LocalNotifications)
    return {
      supported: true,
      ...normalizeNativeNotificationCapability({
        permission: current.display || 'prompt',
        enabled,
        exact,
      }),
    }
  } catch {
    return { supported: false, ...normalizeNativeNotificationCapability() }
  }
}

export async function openExactNotificationSettings() {
  const LocalNotifications = await getLocalNotifications()
  if (!LocalNotifications || typeof LocalNotifications.changeExactNotificationSetting !== 'function') {
    return false
  }
  await LocalNotifications.changeExactNotificationSetting()
  return true
}

async function areNotificationsEnabled(LocalNotifications) {
  if (typeof LocalNotifications.areEnabled !== 'function') return true
  try {
    const result = await LocalNotifications.areEnabled()
    return result?.value !== false
  } catch {
    return true
  }
}

async function getExactNotificationSetting(LocalNotifications) {
  if (typeof LocalNotifications.checkExactNotificationSetting !== 'function') return 'unknown'
  try {
    const result = await LocalNotifications.checkExactNotificationSetting()
    return result?.value || 'unknown'
  } catch {
    return 'unknown'
  }
}

async function ensureReminderNotificationChannel(LocalNotifications) {
  if (typeof LocalNotifications.createChannel !== 'function') return

  try {
    await LocalNotifications.createChannel({
      id: REMINDER_NOTIFICATION_CHANNEL_ID,
      name: 'Personal Server reminders',
      description: 'Habit and workout reminders from Personal Server.',
      importance: 4,
      visibility: 1,
      lights: true,
      vibration: true,
    })
  } catch {
    // Channel creation can fail on platforms that do not need channels.
  }
}

async function ensureAiNotificationChannel(LocalNotifications) {
  if (typeof LocalNotifications.createChannel !== 'function') return

  try {
    await LocalNotifications.createChannel({
      id: AI_NOTIFICATION_CHANNEL_ID,
      name: 'Personal Server assistant',
      description: 'Custom alerts written by the Personal Server AI assistant.',
      importance: 4,
      visibility: 1,
      lights: true,
      vibration: true,
    })
  } catch {
    // Channel creation can fail on platforms that do not need channels.
  }
}

export async function deliverCustomNotification({ id, nativeId, title, body, actionUrl }) {
  const LocalNotifications = await getLocalNotifications()
  if (LocalNotifications) {
    const allowed = await requestNotificationPermission()
    if (!allowed) return false

    await ensureAiNotificationChannel(LocalNotifications)
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Number(nativeId) || 520001,
          title: title || 'Personal Server',
          body: body || '',
          channelId: AI_NOTIFICATION_CHANNEL_ID,
          autoCancel: true,
          extra: {
            notificationId: id,
            actionUrl: actionUrl || null,
          },
        },
      ],
    })
    return true
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title || 'Personal Server', {
      body: body || '',
      data: { notificationId: id, actionUrl: actionUrl || null },
    })
    return true
  }

  return false
}

export async function scheduleHabitReminder({ id, title, body, hour, minute }) {
  const LocalNotifications = await getLocalNotifications()
  if (!LocalNotifications) return false
  const allowed = await requestNotificationPermission()
  if (!allowed) return false
  const exact = await getExactNotificationSetting(LocalNotifications)
  if (exact === 'denied') return false

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
        schedule: {
          on: { hour, minute },
          repeats: true,
          allowWhileIdle: true,
        },
      },
    ],
  })
  return true
}

export async function scheduleWorkoutReminder({ id, title, body, at }) {
  const LocalNotifications = await getLocalNotifications()
  if (!LocalNotifications) return false
  const allowed = await requestNotificationPermission()
  if (!allowed) return false
  const exact = await getExactNotificationSetting(LocalNotifications)
  if (exact === 'denied') return false

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
        schedule: { at, allowWhileIdle: true },
      },
    ],
  })
  return true
}

export async function cancelNotifications(ids) {
  const LocalNotifications = await getLocalNotifications()
  if (!LocalNotifications) return false
  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  })
  return true
}
