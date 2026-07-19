import assert from 'node:assert/strict'
import test from 'node:test'
import { importRouteWithRecovery, isRecoverableRouteImportError } from './lazyRouteRecovery.mjs'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

test('recognizes deployment-stale route chunk errors', () => {
  assert.equal(isRecoverableRouteImportError(new TypeError('Failed to fetch dynamically imported module')), true)
  assert.equal(isRecoverableRouteImportError(new Error('Invalid response row')), false)
})

test('reloads once when a stale route chunk cannot be imported', async () => {
  const sessionStorage = memoryStorage()
  let reloads = 0
  void importRouteWithRecovery(
    async () => { throw new TypeError('Failed to fetch dynamically imported module') },
    { sessionStorage, reload: () => { reloads += 1 } },
  )
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(reloads, 1)

  await assert.rejects(
    importRouteWithRecovery(
      async () => { throw new TypeError('Failed to fetch dynamically imported module') },
      { sessionStorage, reload: () => { reloads += 1 } },
    ),
    /Failed to fetch dynamically imported module/,
  )
  assert.equal(reloads, 1)
})

test('clears the retry marker after a successful route import', async () => {
  const sessionStorage = memoryStorage()
  sessionStorage.setItem('record:route-import-retry', '1')
  const result = await importRouteWithRecovery(async () => ({ default: 'route' }), { sessionStorage })
  assert.equal(result.default, 'route')
  assert.equal(sessionStorage.getItem('record:route-import-retry'), null)
})
