import assert from 'node:assert/strict'
import test from 'node:test'

const preloadModule = await import('./apiPreload.mjs').catch(() => ({
  getPreloadPathsForRoute: () => [],
  getAllEnabledPreloadPaths: () => [],
}))

const { getAllEnabledPreloadPaths, getPreloadPathsForRoute } = preloadModule

test('maps each primary product route to the data required for its first useful screen', () => {
  assert.ok(getPreloadPathsForRoute('/home').includes('/dashboard/mobile'))
  assert.ok(getPreloadPathsForRoute('/finance').includes('/finance/wallets'))
  assert.ok(getPreloadPathsForRoute('/workout/active').includes('/workout/sessions/active'))
  assert.ok(getPreloadPathsForRoute('/habits').includes('/habits/summary'))
  assert.ok(getPreloadPathsForRoute('/spotify').includes('/spotify/linked'))
  assert.ok(getPreloadPathsForRoute('/media').includes('/media/stats'))
})

test('deduplicates the idle preload plan and excludes modules with sync disabled', () => {
  const paths = getAllEnabledPreloadPaths({
    featureModules: {
      music: { enabled: true, syncEnabled: false },
    },
  })

  assert.equal(paths.length, new Set(paths).size)
  assert.equal(paths.some((path) => path.startsWith('/streams')), false)
  assert.equal(paths.some((path) => path.startsWith('/spotify')), false)
  assert.ok(paths.includes('/habits/summary'))
})

test('normalizes detail routes to their parent preload plan', () => {
  assert.deepEqual(
    getPreloadPathsForRoute('/workout/history/anything'),
    getPreloadPathsForRoute('/workout/history'),
  )
  assert.deepEqual(
    getPreloadPathsForRoute('/media/series/suzume'),
    getPreloadPathsForRoute('/media'),
  )
})
