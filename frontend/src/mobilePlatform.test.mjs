import assert from 'node:assert/strict'
import test from 'node:test'

async function importFreshMobilePlatform() {
  return import(`./mobilePlatform.js?test=${Date.now()}-${Math.random()}`)
}

test('native app detection stays true once the runtime has been detected', async () => {
  const originalWindow = globalThis.window
  const { isNativeMobileApp } = await importFreshMobilePlatform()

  try {
    globalThis.window = {
      Capacitor: { isNativePlatform: () => true },
      location: { protocol: 'http:', hostname: 'localhost' },
    }

    assert.equal(isNativeMobileApp(), true)

    globalThis.window = {
      Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
      location: { protocol: 'http:', hostname: 'localhost' },
    }

    assert.equal(isNativeMobileApp(), true)
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }
  }
})

test('web detection can become native later when the app bridge loads', async () => {
  const originalWindow = globalThis.window
  const { isNativeMobileApp } = await importFreshMobilePlatform()

  try {
    globalThis.window = {
      Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
      location: { protocol: 'http:', hostname: 'localhost' },
    }

    assert.equal(isNativeMobileApp(), false)

    globalThis.window = {
      Capacitor: { isNativePlatform: () => true },
      location: { protocol: 'http:', hostname: 'localhost' },
    }

    assert.equal(isNativeMobileApp(), true)
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }
  }
})

test('default Android APK URL resolves through the latest GitHub release asset', async () => {
  const { ANDROID_APK_URL } = await importFreshMobilePlatform()

  assert.equal(
    ANDROID_APK_URL,
    'https://github.com/Adrian-Luerssen/Personal-Server/releases/latest/download/personal-server.apk',
  )
})
