import test from 'node:test'
import assert from 'node:assert/strict'

import {
  deriveTransactionDefaults,
  groupTransactionsByDate,
  resolvePaymentSuggestion,
  validateRememberedDefaults,
} from './financeViewModel.mjs'

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

test('payment deep links resolve backend ids, event hashes, and local event suffixes', () => {
  const suggestions = [
    { id: 'server-1', eventHash: 'abcdef12345678901234567890' },
    { id: 'server-2', eventHash: 'hash-2' },
  ]
  assert.equal(resolvePaymentSuggestion(suggestions, 'server-2').id, 'server-2')
  assert.equal(resolvePaymentSuggestion(suggestions, 'hash-2').id, 'server-2')
  assert.equal(resolvePaymentSuggestion(suggestions, 'abcdef123456789012').id, 'server-1')
  assert.equal(resolvePaymentSuggestion(suggestions, 'missing'), null)
})

test('remembered defaults keep only wallets and categories that still exist', () => {
  const remembered = {
    name: 'Mercadona', walletId: 'old-wallet', categoryId: 'food',
    note: 'Weekly shop', source: 'merchant-history',
  }
  assert.deepEqual(validateRememberedDefaults(
    remembered,
    [{ id: 'wallet-1' }],
    [{ id: 'food' }],
  ), {
    name: 'Mercadona', walletId: '', categoryId: 'food',
    note: 'Weekly shop', source: 'merchant-history',
  })
})
