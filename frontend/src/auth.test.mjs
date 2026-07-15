import test from 'node:test'
import assert from 'node:assert/strict'

import { clearTokens, getTokens, refreshIfPossible, setTokens } from './auth.js'

function createStorage() {
  const values = new Map()
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
  }
}

test('logout cannot be undone by an in-flight refresh request', async () => {
  globalThis.localStorage = createStorage()
  globalThis.window = { __API_BASE__: 'https://record.test' }
  setTokens({ accessToken: 'old-access', refreshToken: 'old-refresh' })

  let finishRefresh
  globalThis.fetch = () => new Promise((resolve) => {
    finishRefresh = () => resolve({
      ok: true,
      json: async () => ({ accessToken: 'restored-access', refreshToken: 'restored-refresh' }),
    })
  })

  const refreshing = refreshIfPossible()
  clearTokens()
  finishRefresh()

  assert.equal(await refreshing, false)
  assert.deepEqual(getTokens(), { accessToken: null, refreshToken: null })
})
