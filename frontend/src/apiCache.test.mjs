import assert from 'node:assert/strict'
import test from 'node:test'
import { createApiResponseCache } from './apiCache.mjs'

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

test('isolates cached API responses by account', () => {
  const storage = createMemoryStorage()
  let accountId = 'account-a'
  const cache = createApiResponseCache({
    storage,
    getAccountId: () => accountId,
    now: () => 1000,
  })

  cache.set('/dashboard/mobile', { owner: 'account-a' })
  accountId = 'account-b'

  assert.equal(cache.get('/dashboard/mobile'), null)

  cache.set('/dashboard/mobile', { owner: 'account-b' })
  assert.deepEqual(cache.get('/dashboard/mobile')?.data, { owner: 'account-b' })

  accountId = 'account-a'
  assert.deepEqual(cache.get('/dashboard/mobile')?.data, { owner: 'account-a' })
})

test('notifies path subscribers when fresh data replaces cached data', () => {
  const storage = createMemoryStorage()
  const cache = createApiResponseCache({
    storage,
    getAccountId: () => 'account-a',
    now: () => 2000,
  })
  const updates = []

  const unsubscribe = cache.subscribe('/dashboard/mobile', (entry) => {
    updates.push(entry.data)
  })
  cache.set('/dashboard/mobile', { score: 42 })
  unsubscribe()
  cache.set('/dashboard/mobile', { score: 50 })

  assert.deepEqual(updates, [{ score: 42 }])
})

test('invalidates matching prefixes only for the active account', () => {
  const storage = createMemoryStorage()
  let accountId = 'account-a'
  const cache = createApiResponseCache({
    storage,
    getAccountId: () => accountId,
    now: () => 3000,
  })

  cache.set('/dashboard/mobile', { owner: 'account-a-dashboard' })
  cache.set('/habits/summary', { owner: 'account-a-habits' })
  accountId = 'account-b'
  cache.set('/dashboard/mobile', { owner: 'account-b-dashboard' })
  cache.set('/habits/summary', { owner: 'account-b-habits' })

  cache.invalidatePrefixes(['/dashboard', '/habits'])

  assert.equal(cache.get('/dashboard/mobile'), null)
  assert.equal(cache.get('/habits/summary'), null)

  accountId = 'account-a'
  assert.deepEqual(cache.get('/dashboard/mobile')?.data, { owner: 'account-a-dashboard' })
  assert.deepEqual(cache.get('/habits/summary')?.data, { owner: 'account-a-habits' })
})

test('stores sync watermarks per account', () => {
  const storage = createMemoryStorage()
  let accountId = 'account-a'
  const cache = createApiResponseCache({
    storage,
    getAccountId: () => accountId,
    now: () => 4000,
  })

  cache.writeWatermarks({ stream: 7 })
  accountId = 'account-b'
  cache.writeWatermarks({ stream: 2 })

  assert.deepEqual(cache.readWatermarks(), { stream: 2 })

  accountId = 'account-a'
  assert.deepEqual(cache.readWatermarks(), { stream: 7 })
})

test('marks matching responses stale without deleting the last usable data', () => {
  const storage = createMemoryStorage()
  const cache = createApiResponseCache({
    storage,
    getAccountId: () => 'account-a',
    now: () => 5000,
  })

  cache.set('/habits/summary', { completed: 4 }, { lastValidatedAt: 5000 })
  cache.markPrefixesStale(['/habits'])

  assert.deepEqual(cache.get('/habits/summary'), {
    data: { completed: 4 },
    timestamp: 5000,
    lastValidatedAt: 0,
    stale: true,
  })
})

test('updates cached data immediately and persists the optimistic value', () => {
  const storage = createMemoryStorage()
  const cache = createApiResponseCache({
    storage,
    getAccountId: () => 'account-a',
    now: () => 6000,
  })
  cache.set('/media?page=1', { items: [{ id: 'suzume', rating: null }] })

  cache.update('/media?page=1', (data) => ({
    ...data,
    items: data.items.map((item) => item.id === 'suzume' ? { ...item, rating: 9 } : item),
  }))

  const reloaded = createApiResponseCache({
    storage,
    getAccountId: () => 'account-a',
    now: () => 7000,
  })
  assert.equal(reloaded.get('/media?page=1')?.data.items[0].rating, 9)
  assert.equal(reloaded.get('/media?page=1')?.stale, true)
})

test('updates every cached query under an active-account prefix', () => {
  const storage = createMemoryStorage()
  let accountId = 'account-a'
  const cache = createApiResponseCache({
    storage,
    getAccountId: () => accountId,
    now: () => 6500,
  })
  cache.set('/finance/transactions?page=1', [{ id: 'one', amount: 4 }])
  cache.set('/finance/transactions?page=2', [{ id: 'two', amount: 8 }])
  accountId = 'account-b'
  cache.set('/finance/transactions?page=1', [{ id: 'other', amount: 12 }])
  accountId = 'account-a'

  cache.updatePrefixes(['/finance/transactions?'], (data) => (
    data.map(item => ({ ...item, pending: true }))
  ))

  assert.equal(cache.get('/finance/transactions?page=1')?.data[0].pending, true)
  assert.equal(cache.get('/finance/transactions?page=2')?.data[0].pending, true)
  accountId = 'account-b'
  assert.equal(cache.get('/finance/transactions?page=1')?.data[0].pending, undefined)
})

test('replacing an existing entry keeps it in the hot end of the bounded cache', () => {
  const storage = createMemoryStorage()
  const cache = createApiResponseCache({
    storage,
    getAccountId: () => 'account-a',
    now: () => 8000,
    maxEntries: 2,
  })

  cache.set('/first', 1)
  cache.set('/second', 2)
  cache.set('/first', 10)
  cache.set('/third', 3)

  const reloaded = createApiResponseCache({
    storage,
    getAccountId: () => 'account-a',
    now: () => 9000,
    maxEntries: 2,
  })
  assert.equal(reloaded.get('/second'), null)
  assert.equal(reloaded.get('/first')?.data, 10)
  assert.equal(reloaded.get('/third')?.data, 3)
})
