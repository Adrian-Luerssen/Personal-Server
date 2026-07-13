import test from 'node:test'
import assert from 'node:assert/strict'

import { deriveTransactionDefaults, groupTransactionsByDate } from './financeViewModel.mjs'

test('ledger groups newest dates first without changing row order', () => {
  const groups = groupTransactionsByDate([
    { id: 'a', date: '2026-07-12' },
    { id: 'b', date: '2026-07-13' },
    { id: 'c', date: '2026-07-13' },
  ])
  assert.deepEqual(groups.map((group) => group.date), ['2026-07-13', '2026-07-12'])
  assert.deepEqual(groups[0].items.map((item) => item.id), ['b', 'c'])
})

test('merchant history suggests but does not hide wallet and category defaults', () => {
  const result = deriveTransactionDefaults({
    merchant: 'Mercadona',
    history: [{ walletId: 'w1', categoryId: 'food' }],
  })
  assert.deepEqual(result, { walletId: 'w1', categoryId: 'food', source: 'merchant-history' })
})
