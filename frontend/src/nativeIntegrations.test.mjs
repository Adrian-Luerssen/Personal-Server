import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HEALTH_CONNECT_AUTO_SYNC_KEY,
  STEP_SYNC_PREFERENCES_KEY,
  buildActivityMetricPayload,
  buildStepSyncConfig,
  mergeLiveStepIntoActivitySummary,
  normalizeLiveStepEvent,
  normalizeStepSyncPreferences,
  summarizeActivityMetrics,
  normalizeHealthConnectStatus,
  shouldAutoSyncHealthConnectSteps,
  shouldStartLiveStepStream,
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

test('summarizeActivityMetrics exposes today and weekly step totals for native UI', () => {
  const summary = summarizeActivityMetrics(
    [
      { date: '2026-06-29', steps: 8450, distanceMeters: 6200, activeCalories: 310 },
      { date: '2026-06-28', steps: 7200, distanceMeters: 5100, activeCalories: 260 },
    ],
    '2026-06-29',
  )

  assert.deepEqual(summary, {
    today: {
      date: '2026-06-29',
      steps: 8450,
      distanceMeters: 6200,
      activeCalories: 310,
    },
    week: {
      steps: 15650,
      distanceMeters: 11300,
      activeCalories: 570,
      daysWithData: 2,
    },
    recent: [
      { date: '2026-06-29', steps: 8450, distanceMeters: 6200, activeCalories: 310 },
      { date: '2026-06-28', steps: 7200, distanceMeters: 5100, activeCalories: 260 },
    ],
  })
})

test('normalizeHealthConnectStatus maps native availability codes to user-facing states', () => {
  assert.equal(normalizeHealthConnectStatus({ status: 'available' }).available, true)
  assert.equal(normalizeHealthConnectStatus({ status: 'update_required' }).action, 'install_or_update')
  assert.equal(normalizeHealthConnectStatus(null).available, false)
})

test('Health Connect auto sync only runs in native app after permission and freshness window', () => {
  assert.equal(HEALTH_CONNECT_AUTO_SYNC_KEY, 'personal-server-health-connect-last-sync')
  assert.equal(shouldAutoSyncHealthConnectSteps({ nativeApp: false, permissionsGranted: true }), false)
  assert.equal(shouldAutoSyncHealthConnectSteps({ nativeApp: true, permissionsGranted: false }), false)
  assert.equal(
    shouldAutoSyncHealthConnectSteps({
      nativeApp: true,
      permissionsGranted: true,
      lastSync: 1000,
      now: 30 * 60_000,
      minIntervalMs: 60 * 60_000,
    }),
    false,
  )
  assert.equal(
    shouldAutoSyncHealthConnectSteps({
      nativeApp: true,
      permissionsGranted: true,
      lastSync: 1000,
      now: 2 * 60 * 60_000,
      minIntervalMs: 60 * 60_000,
    }),
    true,
  )
})

test('live step events update the local activity summary immediately', () => {
  const summary = summarizeActivityMetrics(
    [
      { date: '2026-06-29', steps: 5000, source: 'health-connect' },
      { date: '2026-06-28', steps: 7000, source: 'health-connect' },
    ],
    '2026-06-29',
  )

  const event = normalizeLiveStepEvent({
    date: '2026-06-29',
    steps: 5123.4,
    source: 'android-step-counter-live',
    syncedAt: '2026-06-29T12:30:00.000Z',
  })
  const next = mergeLiveStepIntoActivitySummary(summary, event, '2026-06-29')

  assert.equal(next.today.steps, 5123)
  assert.equal(next.today.source, 'android-step-counter-live')
  assert.equal(next.week.steps, 12123)
  assert.deepEqual(
    buildActivityMetricPayload([event]).metrics[0],
    {
      date: '2026-06-29',
      source: 'android-step-counter-live',
      steps: 5123,
      distanceMeters: null,
      activeCalories: null,
      syncedAt: '2026-06-29T12:30:00.000Z',
    },
  )
})

test('step sync preferences allow live and background modes independently', () => {
  assert.equal(STEP_SYNC_PREFERENCES_KEY, 'personal-server-step-sync-preferences')

  const defaults = normalizeStepSyncPreferences(null)
  assert.deepEqual(defaults, {
    liveEnabled: true,
    backgroundEnabled: true,
    backgroundIntervalMinutes: 15,
    syncDays: 7,
  })

  const customized = normalizeStepSyncPreferences({
    liveEnabled: false,
    backgroundEnabled: true,
    backgroundIntervalMinutes: 4,
    syncDays: 60,
  })

  assert.deepEqual(customized, {
    liveEnabled: false,
    backgroundEnabled: true,
    backgroundIntervalMinutes: 15,
    syncDays: 30,
  })

  assert.equal(shouldStartLiveStepStream({ nativeApp: true, liveEnabled: true }), true)
  assert.equal(shouldStartLiveStepStream({ nativeApp: true, liveEnabled: false }), false)
  assert.equal(shouldStartLiveStepStream({ nativeApp: false, liveEnabled: true }), false)
})

test('background step sync config carries only the native worker contract', () => {
  const config = buildStepSyncConfig({
    preferences: {
      liveEnabled: true,
      backgroundEnabled: true,
      backgroundIntervalMinutes: 20,
      syncDays: 10,
    },
    apiBaseUrl: 'https://example.com/api',
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    },
  })

  assert.deepEqual(config, {
    enabled: true,
    intervalMinutes: 20,
    days: 10,
    apiBaseUrl: 'https://example.com/api',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  })
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
