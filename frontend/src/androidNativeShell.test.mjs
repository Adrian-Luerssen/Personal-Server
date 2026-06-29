import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const mainActivityPath = resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/MainActivity.java',
)
const mainActivity = readFileSync(mainActivityPath, 'utf8')
const stylesPath = resolve(process.cwd(), 'android/app/src/main/res/values/styles.xml')
const styles = readFileSync(stylesPath, 'utf8')
const indexHtmlPath = resolve(process.cwd(), 'index.html')
const indexHtml = readFileSync(indexHtmlPath, 'utf8')

test('native Android activity colors system bars to match the app shell', () => {
  assert.match(mainActivity, /setStatusBarColor/)
  assert.match(mainActivity, /setNavigationBarColor/)
  assert.match(mainActivity, /FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS/)
  assert.match(mainActivity, /setStatusBarContrastEnforced\(false\)/)
  assert.match(mainActivity, /setNavigationBarContrastEnforced\(false\)/)
  assert.match(mainActivity, /SYSTEM_UI_FLAG_LIGHT_STATUS_BAR/)
  assert.match(mainActivity, /SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR/)
})

test('native Android activity owns edge-to-edge surfaces instead of showing launcher grey bars', () => {
  assert.match(mainActivity, /WindowCompat\.setDecorFitsSystemWindows\(window,\s*false\)/)
  assert.match(mainActivity, /setSystemBarsBehavior/)
  assert.match(mainActivity, /setBackgroundColor\(NATIVE_SHELL_COLOR\)/)
  assert.match(styles, /android:windowLightStatusBar">false/)
  assert.match(styles, /android:windowLightNavigationBar">false/)
  assert.match(styles, /android:windowLayoutInDisplayCutoutMode">shortEdges/)
  assert.match(indexHtml, /viewport-fit=cover/)
})

test('native Android back gesture navigates WebView history before backgrounding the app', () => {
  assert.match(mainActivity, /OnBackPressedCallback/)
  assert.match(mainActivity, /handleOnBackPressed/)
  assert.match(mainActivity, /webView\.canGoBack\(\)/)
  assert.match(mainActivity, /webView\.goBack\(\)/)
  assert.match(mainActivity, /moveTaskToBack\(true\)/)
})
