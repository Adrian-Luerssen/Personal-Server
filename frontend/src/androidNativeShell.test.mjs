import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const mainActivityPath = resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/MainActivity.java',
)
const mainActivity = readFileSync(mainActivityPath, 'utf8')
const launcherActivity = readFileSync(resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/RecordLauncherActivity.java',
), 'utf8')
const manifestPath = resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml')
const manifest = readFileSync(manifestPath, 'utf8')
const stylesPath = resolve(process.cwd(), 'android/app/src/main/res/values/styles.xml')
const styles = readFileSync(stylesPath, 'utf8')
const indexHtmlPath = resolve(process.cwd(), 'index.html')
const indexHtml = readFileSync(indexHtmlPath, 'utf8')
const updaterPluginPath = resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/updates/PersonalServerUpdatePlugin.java',
)
const paymentListenerPath = resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/payments/PaymentNotificationListenerService.java',
)
const paymentStorePath = resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/payments/PaymentSuggestionStore.java',
)
const paymentsPluginPath = resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/payments/PersonalServerPaymentsPlugin.java',
)
const paymentParserPath = resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/payments/PaymentNotificationParser.java',
)
const paymentActionReceiverPath = resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/payments/PaymentSuggestionActionReceiver.java',
)
const appRouter = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')
const sessionSource = readFileSync(resolve(process.cwd(), 'src/session.js'), 'utf8')
const healthPlugin = readFileSync(resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/health/PersonalServerHealthPlugin.kt',
), 'utf8')
const stepSyncStore = readFileSync(resolve(
  process.cwd(),
  'android/app/src/main/java/com/adrianluerssen/personalserver/health/StepSyncStore.kt',
), 'utf8')

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
  assert.ok(
    mainActivity.indexOf('webView.canGoBack()') < mainActivity.indexOf('window.personalServerHandleNativeBack'),
    'Android back must consume the actual WebView history before using route fallbacks',
  )
  assert.match(mainActivity, /moveTaskToBack\(true\)/)
})

test('native Android shell exposes an in-app APK installer bridge', () => {
  const updaterPlugin = readFileSync(updaterPluginPath, 'utf8')
  assert.match(mainActivity, /PersonalServerUpdatePlugin/)
  assert.match(manifest, /android\.permission\.REQUEST_INSTALL_PACKAGES/)
  assert.match(updaterPlugin, /@CapacitorPlugin\(name = "PersonalServerUpdater"\)/)
  assert.match(updaterPlugin, /installUpdate/)
  assert.match(updaterPlugin, /ACTION_MANAGE_UNKNOWN_APP_SOURCES/)
  assert.match(updaterPlugin, /application\/vnd\.android\.package-archive/)
  assert.match(updaterPlugin, /FileProvider\.getUriForFile/)
})

test('native payment detection cannot reprocess Personal Server prompts', () => {
  const paymentListener = readFileSync(paymentListenerPath, 'utf8')
  const paymentParser = readFileSync(paymentParserPath, 'utf8')

  assert.match(paymentListener, /packageName\.equals\(getPackageName\(\)\)/)
  assert.match(paymentListener, /Notification\.FLAG_GROUP_SUMMARY/)
  assert.match(paymentListener, /CHANNEL_ID\.equals\(notification\.getChannelId\(\)\)/)
  assert.match(paymentListener, /sbn\.getKey\(\)/)
  assert.match(paymentParser, /sourceNotificationKey/)
  assert.match(paymentListener, /PaymentSuggestionStore\.addSuggestion/)
  assert.match(paymentListener, /showDetectedPaymentNotification/)
})

test('detected payments stay normalized locally and offer review actions', () => {
  const paymentListener = readFileSync(paymentListenerPath, 'utf8')
  const paymentParser = readFileSync(paymentParserPath, 'utf8')
  const paymentActions = readFileSync(paymentActionReceiverPath, 'utf8')

  assert.match(paymentParser, /amountMinor/)
  assert.match(paymentParser, /android-notification-v3/)
  assert.doesNotMatch(paymentParser, /suggestion\.put\("rawText"/)
  assert.match(paymentListener, /"Confirm"/)
  assert.match(paymentListener, /"Edit"/)
  assert.match(paymentListener, /"Ignore"/)
  assert.match(paymentActions, /PaymentSuggestionStore\.clearSuggestion/)
  assert.match(paymentListener, /captureAction/)
  assert.match(paymentListener, /putExtra\(PaymentSuggestionActionReceiver\.EXTRA_SUGGESTION_ID, suggestionId\)/)
  assert.doesNotMatch(paymentActions, /startActivity/)
  assert.match(paymentListener, /PendingIntent\.getActivity/)
  assert.match(mainActivity, /personalServerOpenPaymentReview/)
  assert.match(mainActivity, /paymentSuggestionId/)
  assert.match(appRouter, /window\.personalServerOpenPaymentReview/)
  assert.match(appRouter, /navigate\(route\)/)
  assert.match(manifest, /PaymentSuggestionActionReceiver/)
})

test('Android launcher replaces the retired component and every cached icon identity', () => {
  assert.match(manifest, /android:icon="@mipmap\/record_bookplate_r_v3"/)
  assert.match(manifest, /android:roundIcon="@mipmap\/record_bookplate_r_v3_round"/)
  assert.match(manifest, /android:name="\.MainActivity"[\s\S]*?android:enabled="false"/)
  assert.match(manifest, /android:name="\.RecordLauncherActivity"/)
  assert.doesNotMatch(manifest, /<activity-alias[\s\S]*?android:name="\.RecordLauncherV3"/)
  assert.match(launcherActivity, /extends MainActivity/)
  assert.match(manifest, /android:allowBackup="false"/)
})

test('native sign out removes background refresh credentials and scheduled sync', () => {
  assert.match(sessionSource, /clearStepSyncCredentials/)
  assert.match(healthPlugin, /clearStepSyncCredentials/)
  assert.match(healthPlugin, /cancelUniqueWork\(stepSyncWorkName\)/)
  assert.match(stepSyncStore, /fun clearCredentials/)
  assert.match(stepSyncStore, /remove\(KEY_ACCESS_TOKEN\)/)
  assert.match(stepSyncStore, /remove\(KEY_REFRESH_TOKEN\)/)
})

test('native payment bridge purges self-generated payment loop suggestions', () => {
  const paymentStore = readFileSync(paymentStorePath, 'utf8')
  const paymentsPlugin = readFileSync(paymentsPluginPath, 'utf8')

  assert.match(paymentStore, /removeSuggestionsFromPackage/)
  assert.match(paymentsPlugin, /purgeSelfGeneratedSuggestions/)
  assert.match(paymentsPlugin, /PaymentSuggestionStore\.removeSuggestionsFromPackage/)
  assert.match(paymentsPlugin, /NotificationManager/)
  assert.match(paymentsPlugin, /manager\.cancel\(PaymentNotificationListenerService\.notificationIdForSuggestionId/)
})
