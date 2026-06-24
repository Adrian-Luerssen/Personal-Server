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
