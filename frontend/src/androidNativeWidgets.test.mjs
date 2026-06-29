import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function readAndroidFile(relativePath) {
  return readFileSync(new URL(`../android/app/src/main/${relativePath}`, import.meta.url), 'utf8')
}

describe('Android native widgets', () => {
  it('registers the home and lock-screen-safe Personal Server widgets in the Android manifest', () => {
    const manifest = readAndroidFile('AndroidManifest.xml')

    assert.match(manifest, /PersonalServerTodayWidgetProvider/)
    assert.match(manifest, /@xml\/widget_today_summary_info/)
    assert.match(manifest, /PersonalServerHabitsWidgetProvider/)
    assert.match(manifest, /@xml\/widget_habits_summary_info/)
    assert.match(manifest, /PersonalServerLockScreenWidgetProvider/)
    assert.match(manifest, /@xml\/widget_lock_screen_summary_info/)
  })

  it('marks only the compact lock-screen widget as keyguard-only and privacy-safe', () => {
    const todayInfo = readAndroidFile('res/xml/widget_today_summary_info.xml')
    const habitsInfo = readAndroidFile('res/xml/widget_habits_summary_info.xml')
    const lockInfo = readAndroidFile('res/xml/widget_lock_screen_summary_info.xml')
    const lockLayout = readAndroidFile('res/layout/widget_lock_screen_summary.xml')

    assert.match(todayInfo, /android:widgetCategory="home_screen"/)
    assert.match(habitsInfo, /android:widgetCategory="home_screen"/)
    assert.match(lockInfo, /android:widgetCategory="keyguard"/)
    assert.doesNotMatch(lockLayout, /spend|stream|finance|money/i)
  })

  it('keeps widget updater ids aligned with native layouts', () => {
    const updater = readAndroidFile('java/com/adrianluerssen/personalserver/widgets/PersonalServerWidgetUpdater.java')
    const todayLayout = readAndroidFile('res/layout/widget_today_summary.xml')
    const habitsLayout = readAndroidFile('res/layout/widget_habits_summary.xml')
    const lockLayout = readAndroidFile('res/layout/widget_lock_screen_summary.xml')

    for (const id of ['widget_today_root', 'widget_today_score', 'widget_today_habits', 'widget_today_updated']) {
      assert.match(updater, new RegExp(`R\\.id\\.${id}`))
      assert.match(todayLayout, new RegExp(`@\\+id/${id}`))
    }

    for (const id of ['widget_today_brief_card', 'widget_today_brief_detail', 'widget_today_habits_card', 'widget_today_spend_card']) {
      assert.match(updater, new RegExp(`R\\.id\\.${id}`))
      assert.match(todayLayout, new RegExp(`@\\+id/${id}`))
    }

    for (const id of ['widget_habits_root', 'widget_habits_ratio', 'widget_habits_remaining', 'widget_habits_updated']) {
      assert.match(updater, new RegExp(`R\\.id\\.${id}`))
      assert.match(habitsLayout, new RegExp(`@\\+id/${id}`))
    }

    for (const id of ['widget_lock_root', 'widget_lock_score', 'widget_lock_habits', 'widget_lock_status', 'widget_lock_updated']) {
      assert.match(updater, new RegExp(`R\\.id\\.${id}`))
      assert.match(lockLayout, new RegExp(`@\\+id/${id}`))
    }
  })

  it('exposes native widget status and home-screen pinning through the Capacitor plugin', () => {
    const plugin = readAndroidFile('java/com/adrianluerssen/personalserver/widgets/PersonalServerWidgetsPlugin.java')

    assert.match(plugin, /void getWidgetStatus/)
    assert.match(plugin, /void pinWidget/)
    assert.match(plugin, /isRequestPinAppWidgetSupported/)
  })

  it('uses the 4x2 Today widget space for a brief card and contained metric cells', () => {
    const todayLayout = readAndroidFile('res/layout/widget_today_summary.xml')

    assert.match(todayLayout, /@drawable\/widget_brief_background/)
    assert.match(todayLayout, /@drawable\/widget_metric_background/)
    assert.doesNotMatch(todayLayout, /android:gravity="bottom"/)
    assert.match(todayLayout, /@string\/widget_label_remaining/)
  })
})
