import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createAndroidWidgetSnapshot,
  saveAndroidWidgetSnapshot,
} from './androidWidgets.mjs'

describe('Android widget snapshot bridge', () => {
  it('maps cached mobile dashboard data into a compact native widget snapshot', () => {
    const snapshot = createAndroidWidgetSnapshot({
      generatedAt: '2026-06-25T16:30:00.000Z',
      intelligence: { score: 72 },
      habits: {
        today: [
          { habitName: 'Gym', todayStatus: 'success' },
          { habitName: 'Read', todayStatus: 'none' },
          { habitName: 'No sugar', completedToday: false },
        ],
      },
      workout: { totals: { totalWorkouts: 4 } },
      finance: { summary: { totalExpense: -247 } },
      spotify: { stats: { totalStreams: 4590 } },
    })

    assert.deepEqual(snapshot, {
      score: 72,
      habitsDone: 1,
      habitsTotal: 3,
      habitsRemaining: 2,
      workoutsThisWeek: 4,
      monthlySpend: 247,
      currency: 'EUR',
      streams: 4590,
      generatedAt: '2026-06-25T16:30:00.000Z',
      status: '2 habits remaining',
      briefDetail: '4 train - EUR 247 spend - 4.6K streams',
      lockScreenStatus: '2 habits remaining',
      lockScreenSensitive: false,
    })
  })

  it('keeps the lock-screen snapshot privacy-safe by default', () => {
    const snapshot = createAndroidWidgetSnapshot({
      intelligence: { score: 88 },
      habits: {
        today: [
          { habitName: 'Gym', todayStatus: 'success' },
          { habitName: 'Read', todayStatus: 'none' },
        ],
      },
      finance: { summary: { totalExpense: -999 } },
      spotify: { stats: { totalStreams: 12500 } },
    })

    assert.equal(snapshot.lockScreenSensitive, false)
    assert.equal(snapshot.lockScreenStatus, '1 habit remaining')
    assert.equal(snapshot.status, '1 habit remaining')
    assert.equal(Object.hasOwn(snapshot, 'lockScreenSpend'), false)
    assert.equal(Object.hasOwn(snapshot, 'lockScreenStreams'), false)
  })

  it('does not let a zero weekly stream count hide registered Spotify stats', () => {
    const snapshot = createAndroidWidgetSnapshot({
      weeklySummary: { streams: 0 },
      spotify: { stats: { totalStreams: 37 } },
      habits: { today: [] },
    })

    assert.equal(snapshot.streams, 37)
  })

  it('uses explicit today values without falling back to month or all-time totals', () => {
    const snapshot = createAndroidWidgetSnapshot({
      today: { financeSpent: 0, financeCurrency: 'EUR', streams: 0 },
      weeklySummary: { streams: 91 },
      finance: { monthlySpent: 1205, summary: { totalExpense: 1205, currency: 'EUR' } },
      spotify: { stats: { totalStreams: 6100 } },
      habits: { today: [] },
    })

    assert.equal(snapshot.monthlySpend, 0)
    assert.equal(snapshot.currency, 'EUR')
    assert.equal(snapshot.streams, 0)
  })

  it('sends the snapshot to the native widget plugin when running in Capacitor', async () => {
    const calls = []
    const plugin = {
      saveSnapshot: async (payload) => calls.push(['save', payload]),
      refreshWidgets: async () => calls.push(['refresh']),
    }

    const saved = await saveAndroidWidgetSnapshot(
      { intelligence: { score: 41 }, habits: { today: [] } },
      { plugin },
    )

    assert.equal(saved, true)
    assert.equal(calls.length, 2)
    assert.equal(calls[0][0], 'save')
    assert.equal(calls[0][1].snapshot.score, 41)
    assert.equal(calls[0][1].snapshot.lockScreenSensitive, false)
    assert.deepEqual(calls[1], ['refresh'])
  })

  it('omits disabled modules from widget metric visibility and brief copy', () => {
    const snapshot = createAndroidWidgetSnapshot({
      generatedAt: '2026-06-25T16:30:00.000Z',
      intelligence: { score: 41 },
      habits: {
        today: [
          { habitName: 'Gym', todayStatus: 'success' },
          { habitName: 'Read', todayStatus: 'none' },
        ],
      },
      workout: { totals: { totalWorkouts: 3 } },
      finance: { summary: { totalExpense: -1205, currency: 'EUR' } },
      spotify: { stats: { totalStreams: 6100 } },
    }, {
      preferences: {
        featureModules: {
          finance: { enabled: false },
          music: { enabled: false },
        },
      },
    })

    assert.deepEqual(snapshot.visibleMetrics, ['habits', 'training'])
    assert.equal(snapshot.monthlySpend, 0)
    assert.equal(snapshot.streams, 0)
    assert.equal(snapshot.briefDetail, '1/2 habits - 3 train')
  })
})
