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
