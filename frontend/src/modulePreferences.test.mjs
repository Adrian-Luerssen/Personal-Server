import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_HOME_WIDGETS,
  DEFAULT_WIDGET_LAYOUT,
  getEnabledHomeWidgets,
  getEnabledPreloadPaths,
  getFeatureModulePreferences,
  isFeatureEnabled,
  isFeatureShownOnHome,
  isFeatureShownOnWidgets,
} from './modulePreferences.mjs'

describe('module preferences', () => {
  it('merges partial account preferences with durable defaults', () => {
    const prefs = getFeatureModulePreferences({
      featureModules: {
        finance: { enabled: false },
        music: { showOnHome: false, showOnWidgets: false },
      },
      homeLayout: {
        widgets: [
          { id: 'music-ranking', module: 'music', visible: true, order: 1 },
          { id: 'habits-today', module: 'habits', visible: true, order: 2 },
        ],
      },
      widgetLayout: {
        today: { metrics: ['habits', 'finance', 'music'] },
      },
    })

    assert.equal(isFeatureEnabled(prefs, 'finance'), false)
    assert.equal(isFeatureShownOnHome(prefs, 'music'), false)
    assert.equal(isFeatureShownOnWidgets(prefs, 'music'), false)
    assert.equal(isFeatureEnabled(prefs, 'habits'), true)
    assert.deepEqual(prefs.widgetLayout.today.metrics, ['habits'])
    assert.equal(DEFAULT_HOME_WIDGETS.some((widget) => widget.id === 'habits-today'), true)
    assert.equal(DEFAULT_WIDGET_LAYOUT.today.metrics.includes('habits'), true)
  })

  it('returns visible home widgets only for enabled modules', () => {
    const prefs = getFeatureModulePreferences({
      featureModules: {
        finance: { enabled: false },
        media: { enabled: true, showOnHome: true },
      },
      homeLayout: {
        widgets: [
          { id: 'finance-today', module: 'finance', visible: true, order: 1 },
          { id: 'media-library', module: 'media', visible: true, order: 2 },
          { id: 'habits-today', module: 'habits', visible: false, order: 3 },
        ],
      },
    })

    assert.deepEqual(
      getEnabledHomeWidgets(prefs).map((widget) => widget.id),
      ['media-library'],
    )
  })

  it('filters preloaded API paths for disabled modules', () => {
    const prefs = getFeatureModulePreferences({
      featureModules: {
        finance: { enabled: false },
        music: { enabled: false },
      },
    })

    const paths = getEnabledPreloadPaths([
      '/dashboard/mobile',
      '/streams/stats?timeframe=all',
      '/finance/transactions/summary',
      '/habits/summary',
      '/workout/exercises',
    ], prefs)

    assert.deepEqual(paths, [
      '/dashboard/mobile',
      '/habits/summary',
      '/workout/exercises',
    ])
  })
})
