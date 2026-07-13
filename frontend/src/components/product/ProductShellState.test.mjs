import assert from 'node:assert/strict'
import test from 'node:test'

import { getProductHeader, getProductBackTarget } from './ProductShellState.mjs'

test('product header names the current working surface rather than a generic app menu', () => {
  assert.deepEqual(getProductHeader('/home'), {
    domain: 'today',
    eyebrow: 'Today',
    title: 'Daily brief',
  })
  assert.deepEqual(getProductHeader('/finance/transactions'), {
    domain: 'cash',
    eyebrow: 'Cash',
    title: 'Ledger',
  })
  assert.deepEqual(getProductHeader('/workout/active'), {
    domain: 'gym',
    eyebrow: 'Gym',
    title: 'Active workout',
  })
  assert.deepEqual(getProductHeader('/media'), {
    domain: 'series',
    eyebrow: 'Series',
    title: 'My list',
  })
})

test('detail surfaces return to their domain before leaving the product', () => {
  assert.equal(getProductBackTarget('/workout/active'), '/workout')
  assert.equal(getProductBackTarget('/finance/import'), '/finance/transactions')
  assert.equal(getProductBackTarget('/media/settings'), '/media')
  assert.equal(getProductBackTarget('/home'), null)
  assert.equal(getProductBackTarget('/settings'), null)
})
