import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyCaptureConfidence,
  cleanDetectedMerchantName,
  normalizePaymentEvent,
  paymentFingerprint,
} from './paymentCapture.mjs'

test('removes Revolut balance boilerplate from detected merchant names', () => {
  assert.equal(cleanDetectedMerchantName('Balboa 🍽 You EUR balance: 🍽 You EUR balance:'), 'Balboa')
  assert.equal(cleanDetectedMerchantName('Incògnit Bar 🍽 You EUR balance: 🍽 You EUR balance:'), 'Incògnit Bar')
  assert.equal(cleanDetectedMerchantName('Mercadona'), 'Mercadona')
})

test('normalized payment events exclude raw notification text', () => {
  const event = normalizePaymentEvent({
    packageName: 'com.bank',
    notificationId: '42',
    rawText: 'Card purchase EUR 12.40 MERCADONA',
    amount: '12.40',
    currency: 'eur',
    merchant: '  MERCADONA  ',
    occurredAt: '2026-07-13T10:00:00Z',
  })

  assert.equal(event.amountMinor, 1240)
  assert.equal(event.amount, 12.4)
  assert.equal(event.currency, 'EUR')
  assert.equal(event.merchant, 'MERCADONA')
  assert.equal('rawText' in event, false)
})

test('fallback fingerprint is stable within the same capture minute', () => {
  const first = paymentFingerprint({ merchant: 'Mercadona', amountMinor: 1240, currency: 'EUR', accountHint: '1234', occurredAt: '2026-07-13T10:00:10Z' })
  const second = paymentFingerprint({ merchant: 'MERCADONA', amountMinor: 1240, currency: 'eur', accountHint: '1234', occurredAt: '2026-07-13T10:00:40Z' })
  assert.equal(first, second)
})

test('source notification identity wins over the fallback fingerprint', () => {
  assert.equal(paymentFingerprint({ sourcePackage: 'com.bank', sourceNotificationKey: 'notification-42' }), 'source:com.bank:notification-42')
})

test('missing wallet or category requires review', () => {
  assert.equal(classifyCaptureConfidence({ amountMinor: 1240, merchant: 'Mercadona' }), 'review')
  assert.equal(classifyCaptureConfidence({ amountMinor: 1240, merchant: 'Mercadona', walletId: 'wallet', categoryId: 'category' }), 'ready')
  assert.equal(classifyCaptureConfidence({ amountMinor: 0, merchant: 'Mercadona' }), 'invalid')
})
