const DEFAULT_CACHE_KEY = 'ps-api-cache'
const DEFAULT_WATERMARKS_KEY = 'ps-sync-watermarks'
const DEFAULT_MAX_ENTRIES = 60

function safeParseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function normalizeAccountId(accountId) {
  return accountId || 'anonymous'
}

export function createApiResponseCache({
  storage,
  getAccountId = () => 'anonymous',
  now = () => Date.now(),
  maxEntries = DEFAULT_MAX_ENTRIES,
  cacheStorageKey = DEFAULT_CACHE_KEY,
  watermarksStorageKey = DEFAULT_WATERMARKS_KEY,
} = {}) {
  const backingStorage = storage || globalThis.localStorage
  const entries = new Map()
  const subscribers = new Map()

  function load() {
    if (!backingStorage) return
    const stored = safeParseJson(backingStorage.getItem(cacheStorageKey), [])
    if (!Array.isArray(stored)) return
    for (const [key, value] of stored) {
      entries.set(key, value)
    }
  }

  function persist() {
    if (!backingStorage) return
    try {
      const storedEntries = [...entries.entries()].slice(-maxEntries)
      backingStorage.setItem(cacheStorageKey, JSON.stringify(storedEntries))
    } catch {
      // Storage may be full or disabled.
    }
  }

  function scopedKey(path, accountId = getAccountId()) {
    return `${normalizeAccountId(accountId)}::${path}`
  }

  function activeAccountPrefix() {
    return `${normalizeAccountId(getAccountId())}::`
  }

  function notify(key, entry) {
    const listeners = subscribers.get(key)
    if (!listeners) return
    for (const listener of listeners) {
      listener(entry)
    }
  }

  function get(path) {
    return entries.get(scopedKey(path)) || null
  }

  function set(path, data, metadata = {}) {
    const key = scopedKey(path)
    const entry = {
      data,
      timestamp: now(),
      ...metadata,
    }
    entries.set(key, entry)
    persist()
    notify(key, entry)
    return entry
  }

  function remove(path) {
    const key = scopedKey(path)
    const existed = entries.delete(key)
    if (existed) {
      persist()
      notify(key, null)
    }
  }

  function invalidatePrefixes(prefixes) {
    const accountPrefix = activeAccountPrefix()
    const normalizedPrefixes = prefixes.filter(Boolean)
    let changed = false

    for (const key of [...entries.keys()]) {
      if (!key.startsWith(accountPrefix)) continue
      const path = key.slice(accountPrefix.length)
      if (!normalizedPrefixes.some((prefix) => path.startsWith(prefix))) continue
      entries.delete(key)
      changed = true
      notify(key, null)
    }

    if (changed) persist()
  }

  function subscribe(path, listener) {
    const key = scopedKey(path)
    const listeners = subscribers.get(key) || new Set()
    listeners.add(listener)
    subscribers.set(key, listeners)
    return () => {
      const current = subscribers.get(key)
      if (!current) return
      current.delete(listener)
      if (current.size === 0) subscribers.delete(key)
    }
  }

  function watermarksKey(accountId = getAccountId()) {
    return `${watermarksStorageKey}:${normalizeAccountId(accountId)}`
  }

  function readWatermarks() {
    if (!backingStorage) return {}
    return safeParseJson(backingStorage.getItem(watermarksKey()), {})
  }

  function writeWatermarks(watermarks) {
    if (!backingStorage) return
    try {
      backingStorage.setItem(watermarksKey(), JSON.stringify(watermarks || {}))
    } catch {
      // Storage may be full or disabled.
    }
  }

  function clearAll() {
    entries.clear()
    if (!backingStorage) return
    try {
      backingStorage.removeItem(cacheStorageKey)
      backingStorage.removeItem(watermarksKey())
      if (typeof backingStorage.key === 'function' && typeof backingStorage.length === 'number') {
        for (let index = backingStorage.length - 1; index >= 0; index -= 1) {
          const key = backingStorage.key(index)
          if (key?.startsWith(`${watermarksStorageKey}:`)) {
            backingStorage.removeItem(key)
          }
        }
      }
    } catch {
      // Ignore storage failures during logout/clear.
    }
  }

  load()

  return {
    get,
    set,
    remove,
    invalidatePrefixes,
    subscribe,
    readWatermarks,
    writeWatermarks,
    clearAll,
    scopedKey,
  }
}
