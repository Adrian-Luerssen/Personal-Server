import test from 'node:test'
import assert from 'node:assert/strict'

import { GLOBAL_DESTINATIONS, getDomainNavigation } from './navigation.mjs'

test('native shell always exposes five stable global destinations', () => {
  assert.deepEqual(GLOBAL_DESTINATIONS.map((item) => item.id), [
    'today',
    'apps',
    'capture',
    'assistant',
    'you',
  ])
})

test('gym local navigation does not replace global navigation', () => {
  assert.deepEqual(getDomainNavigation('/workout').map((item) => item.label), [
    'Today',
    'Active',
    'History',
    'Exercises',
    'Progress',
  ])
})

test('cash uses one ledger destination without duplicate active links', () => {
  assert.deepEqual(
    getDomainNavigation('/finance/transactions').map(({ label }) => label),
    ['Ledger', 'Budgets', 'Analysis'],
  )
})
