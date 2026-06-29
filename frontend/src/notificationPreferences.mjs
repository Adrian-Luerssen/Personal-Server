export const DEFAULT_NOTIFICATION_PREFERENCES = {
  habitReminders: {
    enabledKey: 'notify:habit-reminders',
    timeKey: 'notify:habit-reminders:time',
    legacyEnabledKey: 'habits-reminder-enabled',
    legacyTimeKey: 'habits-reminder-time',
    enabled: true,
    time: '20:00',
  },
  missedHabits: {
    enabledKey: 'notify:missed-habits',
    timeKey: 'notify:missed-habits:time',
    enabled: true,
    time: '21:30',
  },
  workouts: {
    enabledKey: 'notify:workouts',
    timeKey: 'notify:workouts:time',
    enabled: true,
    time: '18:00',
  },
  finance: {
    enabledKey: 'notify:finance',
    enabled: false,
  },
  assistant: {
    enabledKey: 'notify:assistant',
    enabled: true,
  },
  assistantCustom: {
    enabledKey: 'notify:assistant-custom',
    enabled: true,
  },
  updates: {
    enabledKey: 'notify:updates',
    enabled: true,
  },
  quietHours: {
    startKey: 'notify:quiet:start',
    endKey: 'notify:quiet:end',
    start: '23:00',
    end: '07:00',
  },
}

function getStorage(storage) {
  if (storage) return storage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

function readBoolean(storage, primaryKey, legacyKey, defaultValue) {
  const raw = storage?.getItem(primaryKey)
  if (raw != null) return raw === 'true'
  const legacy = legacyKey ? storage?.getItem(legacyKey) : null
  if (legacy != null) return legacy === 'true'
  return defaultValue
}

function readString(storage, primaryKey, legacyKey, defaultValue) {
  return storage?.getItem(primaryKey) || (legacyKey ? storage?.getItem(legacyKey) : null) || defaultValue
}

export function readNotificationPreferences(storageArg) {
  const storage = getStorage(storageArg)
  const prefs = {}

  for (const [id, config] of Object.entries(DEFAULT_NOTIFICATION_PREFERENCES)) {
    if (id === 'quietHours') {
      prefs.quietHours = {
        start: readString(storage, config.startKey, null, config.start),
        end: readString(storage, config.endKey, null, config.end),
      }
      continue
    }

    prefs[id] = {
      enabled: readBoolean(storage, config.enabledKey, config.legacyEnabledKey, config.enabled),
    }
    if (config.timeKey) {
      prefs[id].time = readString(storage, config.timeKey, config.legacyTimeKey, config.time)
    }
  }

  return prefs
}

export function updateNotificationPreference(storageArg, id, patch = {}) {
  const storage = getStorage(storageArg)
  const config = DEFAULT_NOTIFICATION_PREFERENCES[id]
  if (!storage || !config || id === 'quietHours') return readNotificationPreferences(storage)

  if (typeof patch.enabled === 'boolean') {
    storage.setItem(config.enabledKey, String(patch.enabled))
    if (config.legacyEnabledKey) storage.setItem(config.legacyEnabledKey, String(patch.enabled))
  }
  if (typeof patch.time === 'string' && config.timeKey) {
    storage.setItem(config.timeKey, patch.time)
    if (config.legacyTimeKey) storage.setItem(config.legacyTimeKey, patch.time)
  }

  return readNotificationPreferences(storage)
}

export function updateNotificationQuietHours(storageArg, patch = {}) {
  const storage = getStorage(storageArg)
  const config = DEFAULT_NOTIFICATION_PREFERENCES.quietHours
  if (!storage) return readNotificationPreferences(storage)
  if (typeof patch.start === 'string') storage.setItem(config.startKey, patch.start)
  if (typeof patch.end === 'string') storage.setItem(config.endKey, patch.end)
  return readNotificationPreferences(storage)
}

export function isNotificationPreferenceEnabled(id, storageArg) {
  const preferences = readNotificationPreferences(storageArg)
  return preferences[id]?.enabled !== false
}
