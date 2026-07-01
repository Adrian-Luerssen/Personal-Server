import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import config from '../vite.config.mjs'

describe('vite development server configuration', () => {
  it('ignores native build output so Android resource churn cannot crash dev tests', () => {
    const ignored = config.server?.watch?.ignored || []
    assert.ok(
      ignored.some((pattern) => String(pattern).includes('android/**/build/**')),
      'Vite watcher should ignore Android Gradle build output',
    )
  })
})
