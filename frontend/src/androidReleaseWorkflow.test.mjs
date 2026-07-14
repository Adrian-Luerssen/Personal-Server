import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const workflowPath = resolve(process.cwd(), '../.github/workflows/android-release.yml')
const workflow = readFileSync(workflowPath, 'utf8')
const metadataScript = readFileSync(resolve(process.cwd(), 'scripts/generate-android-release-metadata.mjs'), 'utf8')
const syncScript = readFileSync(resolve(process.cwd(), 'scripts/sync-android-release-version.mjs'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
const capacitorConfig = readFileSync(resolve(process.cwd(), 'capacitor.config.ts'), 'utf8')

test('android release workflow runs automatically for every main-branch push', () => {
  assert.match(workflow, /push:\s*\n\s+branches:\s*\n\s+- main/)
  assert.doesNotMatch(workflow, /\n\s+paths:\s*\n/)
  assert.match(workflow, /workflow_dispatch:/)
})

test('android release workflow creates versioned push releases instead of reusing android-latest', () => {
  assert.match(workflow, /release_tag="android-v\$\{app_version\}\.\$\{GITHUB_RUN_NUMBER\}"/)
  assert.doesNotMatch(workflow, /else\s*\n\s+release_tag="android-latest"/)
  assert.match(workflow, /echo "stable_tag=android-latest" >> "\$GITHUB_OUTPUT"/)
  assert.match(workflow, /Move stable android-latest pointer/)
})

test('android release workflow injects the generated release version into the APK and notes', () => {
  assert.match(workflow, /release_version=/)
  assert.match(workflow, /echo "version=\$release_version" >> "\$GITHUB_OUTPUT"/)
  assert.match(workflow, /VITE_APP_VERSION: \$\{\{ steps\.app_version\.outputs\.version \}\}/)
  assert.match(workflow, /ANDROID_VERSION_NAME: \$\{\{ steps\.app_version\.outputs\.version \}\}/)
})

test('local Android preparation cannot package a stale frontend bundle', () => {
  assert.equal(packageJson.scripts['android:prepare'], 'npm run build && cap sync android')
  assert.match(capacitorConfig, /appName:\s*['"]Record['"]/)
  assert.match(capacitorConfig, /webDir:\s*['"]dist['"]/)

  const buildStep = workflow.indexOf('name: Build web app')
  const syncStep = workflow.indexOf('name: Sync Capacitor Android project')
  const apkStep = workflow.indexOf('name: Build release APK')
  assert.ok(buildStep >= 0 && buildStep < syncStep && syncStep < apkStep)
})

test('android release workflow publishes a real changelog in release notes', () => {
  assert.match(workflow, /fetch-depth:\s*0/)
  assert.match(metadataScript, /previousAndroidTag/)
  assert.match(workflow, /generate-android-release-metadata\.mjs/)
  assert.match(metadataScript, /### Changelog/)
  assert.match(metadataScript, /features/)
  assert.match(metadataScript, /fixes/)
  assert.match(metadataScript, /technical/)
})

test('android release workflow can sync app version policy to the backend', () => {
  assert.match(workflow, /APP_RELEASE_SYNC_SECRET/)
  assert.match(workflow, /sync-android-release-version\.mjs/)
  assert.match(syncScript, /app\/versions\/release/)
  assert.match(workflow, /personal-server-release\.json/)
})
