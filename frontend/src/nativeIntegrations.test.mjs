import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildActivityMetricPayload,
  normalizeHealthConnectStatus,
} from './nativeHealth.mjs'
import {
  buildPaymentSuggestionPayload,
  normalizePaymentSuggestion,
} from './nativePayments.mjs'

test('buildActivityMetricPayload keeps daily Health Connect records compact and valid', () => {
  const payload = buildActivityMetricPayload([
    {
      date: '2026-06-29',
      steps: 9450,
      distanceMeters: 6200,
      activeCalories: 320,
      source: 'health-connect',
      syncedAt: '2026-06-29T12:00:00.000Z',
      ignoredNativeField: 'raw',
    },
  ])

  assert.deepEqual(payload, {
    metrics: [
      {
        date: '2026-06-29',
        source: 'health-connect',
        steps: 9450,
        distanceMeters: 6200,
        activeCalories: 320,
        syncedAt: '2026-06-29T12:00:00.000Z',
      },
    ],
  })
})

test('buildActivityMetricPayload rejects impossible step values before syncing', () => {
  assert.throws(
    () => buildActivityMetricPayload([{ date: '2026-06-29', steps: -3 }]),
    /steps must be non-negative/,
  )
})

test('normalizeHealthConnectStatus maps native availability codes to user-facing states', () => {
  assert.equal(normalizeHealthConnectStatus({ status: 'available' }).available, true)
  assert.equal(normalizeHealthConnectStatus({ status: 'update_required' }).action, 'install_or_update')
  assert.equal(normalizeHealthConnectStatus(null).available, false)
})

test('buildPaymentSuggestionPayload strips raw notification fields and normalizes amount data', () => {
  const payload = buildPaymentSuggestionPayload({
    id: 'local-1',
    eventHash: 'hash-1',
    sourcePackage: 'com.bank.app',
    sourceAppLabel: 'Bank',
    merchantRaw: 'Coffee Shop',
    amount: '4.60',
    currency: 'eur',
    occurredAt: '2026-06-29T10:15:00.000Z',
    confidence: 0.85,
    rawText: 'sensitive full notification',
  })

  assert.deepEqual(payload, {
    eventHash: 'hash-1',
    sourcePackage: 'com.bank.app',
    sourceAppLabel: 'Bank',
    merchantRaw: 'Coffee Shop',
    amount: 4.6,
    currency: 'EUR',
    occurredAt: '2026-06-29T10:15:00.000Z',
    confidence: 0.85,
  })
})

test('normalizePaymentSuggestion returns null when a native event has no usable amount', () => {
  assert.equal(normalizePaymentSuggestion({ eventHash: 'hash-1', amount: 0 }), null)
})
