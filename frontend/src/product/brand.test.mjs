import test from 'node:test'
import assert from 'node:assert/strict'

import { DOMAINS, PRODUCT } from './brand.mjs'

test('customer brand is independent from the repository name', () => {
  assert.equal(PRODUCT.repositoryName, 'Personal Server')
  assert.notEqual(PRODUCT.displayName, PRODUCT.repositoryName)
  assert.match(PRODUCT.promise, /records/i)
})

test('every customer domain has a stable tone and label', () => {
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
  }
})
