const DEFAULT_STORAGE_KEY = 'record:api-mutations:v1'
const RETRYABLE_STATUSES = new Set([408, 425, 429])

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function accountKey(value) {
  return String(value || 'anonymous')
}

function defaultId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isTransientError(error) {
  const status = Number(error?.status || 0)
  return !status || RETRYABLE_STATUSES.has(status) || status >= 500
}

function retryDelay(attempts) {
  return Math.min(60_000, 1000 * (2 ** Math.max(0, attempts - 1)))
}

export function createApiMutationQueue({
  storage = globalThis.localStorage,
  storageKey = DEFAULT_STORAGE_KEY,
  getAccountId = () => 'anonymous',
  execute,
  now = () => Date.now(),
  makeId = defaultId,
  online = () => typeof navigator === 'undefined' || navigator.onLine !== false,
  autoStart = true,
  onCommitted,
  onFailed,
} = {}) {
  const storedEntries = safeParse(storage?.getItem(storageKey), [])
  let entries = Array.isArray(storedEntries)
    ? storedEntries.map((entry) => (
        entry?.status === 'syncing'
          ? { ...entry, status: 'queued', nextAttemptAt: 0 }
          : entry
      ))
    : []
  let flushPromise = null
  let retryTimer = null
  const listeners = new Set()
  const resolvers = new Map()

  function activeAccountId() {
    return accountKey(getAccountId())
  }

  function activeEntries() {
    const accountId = activeAccountId()
    return entries
      .filter((entry) => entry.accountId === accountId)
      .sort((left, right) => left.createdAt - right.createdAt)
  }

  function persist() {
    try {
      storage?.setItem(storageKey, JSON.stringify(entries))
    } catch {
      // The queue remains available in memory when persistence is unavailable.
    }
  }

  function getSnapshot() {
    const current = activeEntries()
    const pending = current.filter((entry) => entry.status === 'queued').length
    const syncing = current.filter((entry) => entry.status === 'syncing').length
    const failed = current.filter((entry) => entry.status === 'failed').length
    return {
      pending,
      syncing,
      failed,
      total: current.length,
      state: failed > 0
        ? 'failed'
        : syncing > 0
          ? 'syncing'
          : pending > 0
            ? 'queued'
            : 'fresh',
      entries: current.map((entry) => ({ ...entry })),
    }
  }

  function notify() {
    const snapshot = getSnapshot()
    for (const listener of listeners) listener(snapshot)
  }

  function save() {
    persist()
    notify()
  }

  function promiseFor(id) {
    if (resolvers.has(id)) return resolvers.get(id)
    let resolve
    let reject
    const committed = new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })
    committed.catch(() => {})
    const record = { committed, resolve, reject }
    resolvers.set(id, record)
    return record
  }

  function scheduleFlush(delay = 0) {
    if (!autoStart) return
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = setTimeout(() => {
      retryTimer = null
      flush().catch(() => {})
    }, Math.max(0, delay))
  }

  function enqueue({
    method = 'PATCH',
    path,
    body = null,
    prefixes = [],
    dedupeKey = null,
  }) {
    const accountId = activeAccountId()
    const normalizedMethod = String(method || 'PATCH').toUpperCase()
    const existing = dedupeKey
      ? entries.find((entry) => (
          entry.accountId === accountId &&
          entry.dedupeKey === dedupeKey &&
          entry.status !== 'syncing'
        ))
      : null

    if (existing) {
      Object.assign(existing, {
        method: normalizedMethod,
        path,
        body,
        prefixes: [...new Set(prefixes)],
        status: 'queued',
        attempts: 0,
        nextAttemptAt: 0,
        lastError: null,
      })
      save()
      scheduleFlush()
      const deferred = promiseFor(existing.id)
      return { id: existing.id, committed: deferred.committed }
    }

    const entry = {
      id: makeId(),
      accountId,
      method: normalizedMethod,
      path,
      body,
      prefixes: [...new Set(prefixes)],
      dedupeKey,
      status: 'queued',
      attempts: 0,
      createdAt: now(),
      nextAttemptAt: 0,
      lastError: null,
    }
    entries.push(entry)
    save()
    const deferred = promiseFor(entry.id)
    scheduleFlush()
    return { id: entry.id, committed: deferred.committed }
  }

  async function runFlush({ ignoreBackoff = false } = {}) {
    if (!online() || typeof execute !== 'function') return getSnapshot()
    const accountId = activeAccountId()
    const candidates = activeEntries().filter((entry) => (
      entry.status === 'queued' &&
      (ignoreBackoff || Number(entry.nextAttemptAt || 0) <= now())
    ))

    for (const candidate of candidates) {
      const entry = entries.find((item) => item.id === candidate.id)
      if (!entry || entry.accountId !== accountId || entry.status !== 'queued') continue
      entry.status = 'syncing'
      save()
      try {
        const result = await execute({ ...entry })
        entries = entries.filter((item) => item.id !== entry.id)
        save()
        resolvers.get(entry.id)?.resolve(result)
        resolvers.delete(entry.id)
        await onCommitted?.({ entry, result })
      } catch (error) {
        entry.attempts += 1
        entry.lastError = error?.message || 'Synchronization failed'
        if (isTransientError(error)) {
          entry.status = 'queued'
          entry.nextAttemptAt = now() + retryDelay(entry.attempts)
          save()
          scheduleFlush(Math.max(0, entry.nextAttemptAt - now()))
          break
        }
        entry.status = 'failed'
        entry.nextAttemptAt = 0
        save()
        resolvers.get(entry.id)?.reject(error)
        resolvers.delete(entry.id)
        await onFailed?.({ entry, error })
      }
    }
    return getSnapshot()
  }

  function flush(options) {
    if (flushPromise) return flushPromise
    flushPromise = runFlush(options).finally(() => {
      flushPromise = null
    })
    return flushPromise
  }

  function retryFailed({ includeQueued = false, flush: shouldFlush = true } = {}) {
    const accountId = activeAccountId()
    for (const entry of entries) {
      if (entry.accountId !== accountId) continue
      if (entry.status !== 'failed' && !(includeQueued && entry.status === 'queued')) continue
      entry.status = 'queued'
      entry.attempts = 0
      entry.nextAttemptAt = 0
      entry.lastError = null
      promiseFor(entry.id)
    }
    save()
    if (shouldFlush) scheduleFlush()
    return getSnapshot()
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function clearAccount(accountId = activeAccountId()) {
    const normalized = accountKey(accountId)
    const removed = entries.filter((entry) => entry.accountId === normalized)
    entries = entries.filter((entry) => entry.accountId !== normalized)
    for (const entry of removed) {
      resolvers.get(entry.id)?.reject(new Error('Mutation cleared'))
      resolvers.delete(entry.id)
    }
    save()
  }

  function clearAll() {
    entries = []
    resolvers.clear()
    try {
      storage?.removeItem(storageKey)
    } catch {
      // Ignore storage failures during logout/reset.
    }
    notify()
  }

  if (autoStart && activeEntries().some((entry) => entry.status === 'queued')) {
    scheduleFlush()
  }

  return {
    enqueue,
    flush,
    retryFailed,
    subscribe,
    getSnapshot,
    clearAccount,
    clearAll,
  }
}

export { isTransientError }
