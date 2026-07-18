import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertImportStreamComplete,
  formatImportDuration,
  parseImportProgressChunk,
} from './importProgress.mjs'

describe('import progress stream helpers', () => {
  it('parses complete SSE data events while preserving partial trailing chunks', () => {
    const first = parseImportProgressChunk(
      '',
      'data: {"stage":"starting","progress":0}\n\ndata: {"stage":"entries"'
    )

    assert.deepEqual(first.events, [{ stage: 'starting', progress: 0 }])
    assert.equal(first.buffer, 'data: {"stage":"entries"')

    const second = parseImportProgressChunk(
      first.buffer,
      ',"progress":40}\n\n'
    )

    assert.deepEqual(second.events, [{ stage: 'entries', progress: 40 }])
    assert.equal(second.buffer, '')
  })

  it('formats elapsed import time for long-running imports', () => {
    assert.equal(formatImportDuration(950), '0s')
    assert.equal(formatImportDuration(65_000), '1m 05s')
    assert.equal(formatImportDuration(3_665_000), '1h 01m')
  })

  it('rejects a progress stream that closes before a terminal event', () => {
    assert.throws(
      () => assertImportStreamComplete({ stage: 'sessions', progress: 90 }),
      /connection closed before completion/i,
    )
    assert.doesNotThrow(() => assertImportStreamComplete({ stage: 'complete', progress: 100 }))
    assert.doesNotThrow(() => assertImportStreamComplete({ stage: 'error', progress: 0 }))
  })
})
