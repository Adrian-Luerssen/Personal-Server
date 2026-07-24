import assert from 'node:assert/strict'
import test from 'node:test'

const queueModule = await import('./apiMutationQueue.mjs').catch(() => ({
  createApiMutationQueue: () => ({
    enqueue: () => ({ id: '', committed: Promise.resolve() }),
    flush: async () => {},
    getSnapshot: () => ({ pending: 0, syncing: 0, failed: 0, total: 0, entries: [] }),
    retryFailed: async () => {},
  }),
}))

const { createApiMutationQueue } = queueModule

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}

test('enqueues immediately, persists the mutation, and resolves after background commit', async () => {
  const storage = createMemoryStorage()
  const executed = []
  const queue = createApiMutationQueue({
    storage,
    getAccountId: () => 'account-a',
    execute: async (entry) => {
      executed.push(entry.path)
      return { id: 'server-entry' }
    },
    autoStart: false,
    makeId: () => 'mutation-1',
    now: () => 1000,
  })

  const queued = queue.enqueue({
    method: 'PATCH',
    path: '/habits/one/entries/2026-07-23',
    body: { status: 'success' },
    prefixes: ['/habits', '/dashboard'],
  })

  assert.equal(queue.getSnapshot().pending, 1)
  const reloaded = createApiMutationQueue({
    storage,
    getAccountId: () => 'account-a',
    execute: async () => ({}),
    autoStart: false,
  })
  assert.equal(reloaded.getSnapshot().pending, 1)

  await queue.flush()
  assert.deepEqual(executed, ['/habits/one/entries/2026-07-23'])
  assert.deepEqual(await queued.committed, { id: 'server-entry' })
  assert.equal(queue.getSnapshot().total, 0)
})

test('isolates pending writes by account and only flushes the active account', async () => {
  const storage = createMemoryStorage()
  let accountId = 'account-a'
  const executed = []
  const queue = createApiMutationQueue({
    storage,
    getAccountId: () => accountId,
    execute: async (entry) => {
      executed.push(`${entry.accountId}:${entry.path}`)
      return {}
    },
    autoStart: false,
  })

  queue.enqueue({ method: 'POST', path: '/habits', body: { name: 'Walk' } })
  accountId = 'account-b'
  queue.enqueue({ method: 'POST', path: '/finance/transactions', body: { amount: 4 } })
  await queue.flush()

  assert.deepEqual(executed, ['account-b:/finance/transactions'])
  assert.equal(queue.getSnapshot().total, 0)
  accountId = 'account-a'
  assert.equal(queue.getSnapshot().pending, 1)
})

test('collapses queued edits sharing a dedupe key to the latest intended value', async () => {
  const bodies = []
  const queue = createApiMutationQueue({
    storage: createMemoryStorage(),
    getAccountId: () => 'account-a',
    execute: async (entry) => {
      bodies.push(entry.body)
      return {}
    },
    autoStart: false,
  })

  queue.enqueue({
    method: 'PATCH',
    path: '/habits/one/entries/today',
    body: { status: 'success' },
    dedupeKey: 'habit:one:today',
  })
  queue.enqueue({
    method: 'PATCH',
    path: '/habits/one/entries/today',
    body: { status: 'skip' },
    dedupeKey: 'habit:one:today',
  })

  assert.equal(queue.getSnapshot().pending, 1)
  await queue.flush()
  assert.deepEqual(bodies, [{ status: 'skip' }])
})

test('keeps transient failures queued and marks validation failures for attention', async () => {
  let mode = 'transient'
  const queue = createApiMutationQueue({
    storage: createMemoryStorage(),
    getAccountId: () => 'account-a',
    execute: async () => {
      const error = new Error(mode)
      error.status = mode === 'transient' ? 503 : 422
      throw error
    },
    autoStart: false,
    now: () => 1000,
  })

  queue.enqueue({ method: 'PATCH', path: '/media/one', body: { rating: 9 } })
  await queue.flush()
  assert.equal(queue.getSnapshot().pending, 1)
  assert.equal(queue.getSnapshot().failed, 0)

  mode = 'permanent'
  queue.retryFailed({ includeQueued: true, flush: false })
  await queue.flush({ ignoreBackoff: true })
  assert.equal(queue.getSnapshot().failed, 1)
  assert.equal(queue.getSnapshot().state, 'failed')
})

test('flushes queued writes in creation order', async () => {
  const paths = []
  let clock = 0
  const queue = createApiMutationQueue({
    storage: createMemoryStorage(),
    getAccountId: () => 'account-a',
    execute: async (entry) => {
      paths.push(entry.path)
      return {}
    },
    autoStart: false,
    now: () => ++clock,
  })

  queue.enqueue({ method: 'POST', path: '/first', body: {} })
  queue.enqueue({ method: 'POST', path: '/second', body: {} })
  queue.enqueue({ method: 'POST', path: '/third', body: {} })
  await queue.flush()

  assert.deepEqual(paths, ['/first', '/second', '/third'])
})
