import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const mainActivityPath = resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/MainActivity.java',
)
const mainActivity = readFileSync(mainActivityPath, 'utf8')

test('native Android activity colors system bars to match the app shell', () => {
  assert.match(mainActivity, /setStatusBarColor/)
  assert.match(mainActivity, /setNavigationBarColor/)
  assert.match(mainActivity, /SYSTEM_UI_FLAG_LIGHT_STATUS_BAR/)
  assert.match(mainActivity, /SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR/)
})
