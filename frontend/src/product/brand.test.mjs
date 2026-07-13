import test from 'node:test'
import assert from 'node:assert/strict'

import { DOMAINS, PRODUCT } from './brand.mjs'

test('customer brand is independent from the repository name', () => {
  assert.equal(PRODUCT.repositoryName, 'Personal Server')
  assert.equal(PRODUCT.displayName, 'Personal Record')
  assert.equal(PRODUCT.promise, 'Everything you are, in context.')
})

test('every customer domain has a stable label, tone, and signal color', () => {
  assert.deepEqual(Object.keys(DOMAINS), [
    'today',
    'gym',
    'habits',
    'cash',
    'spotify',
    'series',
    'assistant',
  ])

  for (const domain of Object.values(DOMAINS)) {
    assert.match(domain.label, /\S/)
    assert.match(domain.tone, /^[a-z-]+$/)
    assert.match(domain.color, /^#[0-9a-f]{6}$/i)
  }

  assert.deepEqual(
    Object.fromEntries(Object.entries(DOMAINS).map(([key, domain]) => [key, domain.color])),
    {
      today: '#3b82f6',
      gym: '#f97316',
      habits: '#14b8a6',
      cash: '#22c55e',
      spotify: '#ec4899',
      series: '#f59e0b',
      assistant: '#8b5cf6',
    },
  )
})
