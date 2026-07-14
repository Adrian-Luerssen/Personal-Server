import test from 'node:test'
import assert from 'node:assert/strict'

import { DOMAINS, PRODUCT } from './brand.mjs'

test('customer brand is independent from the repository name', () => {
  assert.equal(PRODUCT.repositoryName, 'Personal Server')
  assert.equal(PRODUCT.displayName, 'Record')
  assert.equal(PRODUCT.promise, 'Keep the life you live useful.')
})

test('every customer domain has a stable label without becoming a visual sub-brand', () => {
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
    assert.equal('tone' in domain, false)
    assert.equal('color' in domain, false)
  }
})
