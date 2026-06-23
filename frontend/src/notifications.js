import { isNativeMobileApp } from './mobilePlatform'

async function getLocalNotifications() {
  if (!isNativeMobileApp()) return null
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
  if (current.display === 'granted') return true

  const requested = await LocalNotifications.requestPermissions()
  return requested.display === 'granted'
}

export async function scheduleHabitReminder({ id, title, body, hour, minute }) {
  const LocalNotifications = await getLocalNotifications()
  if (!LocalNotifications) return false
  const allowed = await requestNotificationPermission()
  if (!allowed) return false

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        schedule: {
          on: { hour, minute },
          repeats: true,
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

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        schedule: { at },
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
