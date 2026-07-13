import test from 'node:test'
import assert from 'node:assert/strict'

import { formatProvenance } from './chatProvenance.mjs'

test('assistant provenance names the date and contributing records', () => {
  assert.deepEqual(formatProvenance({
    pageType: 'today-register',
    filters: {
      date: '2026-07-13',
      sources: ['2 habit records', '1 active workout'],
    },
  }), {
    label: 'today register · Jul 13, 2026',
    sources: ['2 habit records', '1 active workout'],
  })
})
