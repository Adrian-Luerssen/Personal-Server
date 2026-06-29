import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const workflowPath = resolve(process.cwd(), '../.github/workflows/android-release.yml')
const workflow = readFileSync(workflowPath, 'utf8')

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
