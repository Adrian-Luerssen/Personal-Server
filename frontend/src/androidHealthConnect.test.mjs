import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function readAndroidFile(relativePath) {
  return readFileSync(new URL(`../android/app/src/main/${relativePath}`, import.meta.url), 'utf8')
}

describe('Android Health Connect integration', () => {
  it('declares the Health Connect permission rationale and Android 14 permission usage entry points', () => {
    const manifest = readAndroidFile('AndroidManifest.xml')

    assert.match(manifest, /androidx\.health\.ACTION_SHOW_PERMISSIONS_RATIONALE/)
    assert.match(manifest, /android\.intent\.action\.VIEW_PERMISSION_USAGE/)
    assert.match(manifest, /android\.intent\.category\.HEALTH_PERMISSIONS/)
    assert.match(manifest, /android\.permission\.START_VIEW_PERMISSION_USAGE/)
  })

  it('declares both legacy and framework Health Connect onboarding entry points', () => {
    const manifest = readAndroidFile('AndroidManifest.xml')

    assert.match(manifest, /androidx\.health\.ACTION_SHOW_ONBOARDING/)
    assert.match(manifest, /android\.health\.connect\.action\.SHOW_ONBOARDING/)
    assert.match(manifest, /com\.google\.android\.apps\.healthdata\.permission\.START_ONBOARDING/)
    assert.match(manifest, /android\.permission\.health\.START_ONBOARDING/)
  })

  it('keeps step and exact-alarm permissions declared for native notifications and steps', () => {
    const manifest = readAndroidFile('AndroidManifest.xml')

    assert.match(manifest, /android\.permission\.POST_NOTIFICATIONS/)
    assert.match(manifest, /android\.permission\.SCHEDULE_EXACT_ALARM/)
    assert.match(manifest, /android\.permission\.USE_EXACT_ALARM/)
    assert.match(manifest, /android\.permission\.health\.READ_STEPS/)
    assert.match(manifest, /android\.permission\.ACTIVITY_RECOGNITION/)
  })

  it('streams live step counter events from the native Android sensor bridge', () => {
    const plugin = readAndroidFile('java/com/adrianluerssen/personalserver/health/PersonalServerHealthPlugin.kt')

    assert.match(plugin, /Sensor\.TYPE_STEP_COUNTER/)
    assert.match(plugin, /SensorEventListener/)
    assert.match(plugin, /startStepStream/)
    assert.match(plugin, /stopStepStream/)
    assert.match(plugin, /notifyListeners\("stepCountChange"/)
  })

  it('schedules periodic background step sync with WorkManager', () => {
    const buildGradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8')
    const plugin = readAndroidFile('java/com/adrianluerssen/personalserver/health/PersonalServerHealthPlugin.kt')
    const worker = readAndroidFile('java/com/adrianluerssen/personalserver/health/StepBackgroundSyncWorker.kt')

    assert.match(buildGradle, /androidx\.work:work-runtime-ktx/)
    assert.match(plugin, /configureStepSync/)
    assert.match(plugin, /getStepSyncStatus/)
    assert.match(plugin, /PeriodicWorkRequestBuilder<StepBackgroundSyncWorker>/)
    assert.match(plugin, /enqueueUniquePeriodicWork/)
    assert.match(plugin, /ExistingPeriodicWorkPolicy\.UPDATE/)
    assert.match(worker, /class StepBackgroundSyncWorker/)
    assert.match(worker, /CoroutineWorker/)
    assert.match(worker, /HealthConnectClient/)
    assert.match(worker, /AggregateRequest/)
    assert.match(worker, /\/activity\/daily\/sync/)
    assert.match(worker, /\/auth\/refresh/)
    assert.match(worker, /Authorization/)
  })
})
