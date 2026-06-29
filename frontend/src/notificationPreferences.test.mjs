import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  readNotificationPreferences,
  updateNotificationPreference,
} from './notificationPreferences.mjs'

function createStorage(seed = {}) {
  const values = new Map(Object.entries(seed))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

test('reads notification preferences with times and quiet hours from local storage', () => {
  const storage = createStorage({
    'notify:habit-reminders': 'false',
    'notify:habit-reminders:time': '21:15',
    'notify:quiet:start': '23:00',
    'notify:quiet:end': '07:30',
  })

  const preferences = readNotificationPreferences(storage)

  assert.equal(DEFAULT_NOTIFICATION_PREFERENCES.habitReminders.time, '20:00')
  assert.equal(preferences.habitReminders.enabled, false)
  assert.equal(preferences.habitReminders.time, '21:15')
  assert.equal(preferences.quietHours.start, '23:00')
  assert.equal(preferences.quietHours.end, '07:30')
})

test('updates one notification preference without dropping the rest', () => {
  const storage = createStorage({
    'notify:workouts': 'true',
    'notify:workouts:time': '18:00',
  })

  updateNotificationPreference(storage, 'workouts', { enabled: false, time: '06:45' })
  const preferences = readNotificationPreferences(storage)

  assert.equal(preferences.workouts.enabled, false)
  assert.equal(preferences.workouts.time, '06:45')
  assert.equal(preferences.assistantCustom.enabled, true)
})
