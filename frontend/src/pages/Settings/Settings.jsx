import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AgentApiKeys from './AgentApiKeys'
import Connections from './Connections'
import Appearance from './Appearance'
import Account from './Account'
import DataManagement from './DataManagement'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import { APP_BUILD_TIME, APP_VERSION, formatBuildTime } from '../../appVersion.mjs'
import { isNativeMobileApp } from '../../mobilePlatform'
import { checkDataValidity, clearApiCache } from '../../api'
import {
  deliverCustomNotification,
  getNativeNotificationStatus,
  initializeNativeNotifications,
  openExactNotificationSettings,
} from '../../notifications'
import { checkForAndroidUpdate, installAndroidUpdate } from '../../appUpdate'
import {
  configureNativeStepSync,
  getHealthConnectStatus,
  getNativeStepSyncStatus,
  getSyncedActivityMetrics,
  openHealthConnectSettings,
  readStepSyncPreferences,
  requestHealthConnectPermissions,
  stopLiveStepUpdates,
  syncHealthConnectSteps,
  writeStepSyncPreferences,
} from '../../nativeHealth.mjs'
import {
  readNotificationPreferences,
  updateNotificationPreference,
  updateNotificationQuietHours,
} from '../../notificationPreferences.mjs'
import {
  configurePaymentDetection,
  getPaymentDetectionStatus,
  openPaymentNotificationSettings,
  syncNativePaymentSuggestions,
} from '../../nativePayments.mjs'
import {
  getAndroidWidgetStatus,
  pinAndroidWidget,
  refreshAndroidWidgets,
} from '../../androidWidgets.mjs'
import { usePreferences } from '../../contexts/PreferencesContext'
import {
  DEFAULT_HOME_WIDGETS,
  DEFAULT_WIDGET_LAYOUT,
  FEATURE_MODULES,
  getFeatureModulePreferences,
  isFeatureEnabled,
} from '../../modulePreferences.mjs'

const SETTINGS_TABS = new Set(['account', 'connections', 'agent-keys', 'appearance', 'preferences', 'modules', 'data'])

const NATIVE_SETTINGS_SECTIONS = [
  { key: 'account', label: 'Account and Security', description: 'Profile, password, and MFA', icon: 'shield-check' },
  { key: 'connections', label: 'Connections', description: 'Spotify and connected services', icon: 'link' },
  { key: 'integrations', label: 'Health and Payments', description: 'Step counts and detected payment prompts', icon: 'activity' },
  { key: 'modules', label: 'Modules and Home', description: 'Active features and Today cards', icon: 'sliders-horizontal' },
  { key: 'notifications', label: 'Notifications', description: 'Permission, reminders, and alert types', icon: 'bell' },
  { key: 'widgets', label: 'Widgets', description: 'Home-screen widgets and lock-screen behavior', icon: 'panel-top' },
  { key: 'sync', label: 'Sync and Offline', description: 'Cache freshness, retries, and local data', icon: 'refresh-cw' },
  { key: 'updates', label: 'App Updates', description: 'Installed version, release, and APK link', icon: 'smartphone' },
  { key: 'appearance', label: 'Appearance', description: 'Theme, density, and visual preferences', icon: 'palette' },
  { key: 'data', label: 'Data and Imports', description: 'Imports, module settings, export, and reset tools', icon: 'database' },
  { key: 'agent-keys', label: 'Developer Agent Keys', description: 'API keys for external agents', icon: 'key-round' },
]

function normalizeTab(tab) {
  return SETTINGS_TABS.has(tab) ? tab : 'account'
}

function NativeSettingsIndex({ onSelect }) {
  return (
    <div className="native-settings-page">
      <section className="native-settings-hero">
        <h1>Settings</h1>
        <p>Manage account, connections, notifications, sync, updates, imports, and local app behavior.</p>
      </section>

      <section className="native-settings-list" aria-label="Settings sections">
        {NATIVE_SETTINGS_SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="native-settings-row"
            onClick={() => onSelect(item.key)}
          >
            <span className="native-settings-row__icon" aria-hidden="true">
              <Icon name={item.icon} size={20} />
            </span>
            <span className="native-settings-row__copy">
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
            <Icon name="chevron-right" size={18} aria-hidden="true" />
          </button>
        ))}
      </section>
    </div>
  )
}

function NativeSettingsShell({ title, description, icon, onBack, children }) {
  return (
    <div className="native-settings-page">
      <button type="button" className="native-back-row" onClick={onBack}>
        <Icon name="chevron-left" size={18} />
        All settings
      </button>
      <section className="native-settings-hero">
        <h1><Icon name={icon} size={22} aria-hidden="true" /> {title}</h1>
        <p>{description}</p>
      </section>
      {children}
    </div>
  )
}

function NativePreferenceToggle({ storageKey, label, description, defaultEnabled = true, enabled: controlledEnabled, onChange }) {
  const [internalEnabled, setInternalEnabled] = useState(() => {
    if (!storageKey) return defaultEnabled
    const stored = localStorage.getItem(storageKey)
    return stored == null ? defaultEnabled : stored === 'true'
  })
  const enabled = typeof controlledEnabled === 'boolean' ? controlledEnabled : internalEnabled

  function handleChange(next) {
    if (onChange) {
      onChange(next)
      return
    }
    setInternalEnabled(next)
    if (storageKey) localStorage.setItem(storageKey, String(next))
  }

  return (
    <button
      type="button"
      className={`native-toggle-row ${enabled ? 'is-on' : ''}`}
      onClick={() => handleChange(!enabled)}
      aria-pressed={enabled}
    >
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <span className="native-toggle-row__switch" aria-hidden="true" />
    </button>
  )
}

function NativeNotificationPreferenceRow({ id, label, description, preferences, setPreferences, timeLabel = 'Time' }) {
  const preference = preferences[id] || { enabled: false }

  function update(patch) {
    setPreferences(updateNotificationPreference(localStorage, id, patch))
  }

  return (
    <div className="native-notification-pref">
      <NativePreferenceToggle
        enabled={preference.enabled}
        label={label}
        description={description}
        onChange={(enabled) => update({ enabled })}
      />
      {preference.time && preference.enabled && (
        <label className="native-time-field">
          <span>{timeLabel}</span>
          <input
            type="time"
            aria-label={timeLabel}
            value={preference.time}
            onChange={(event) => update({ time: event.target.value })}
          />
        </label>
      )}
    </div>
  )
}

const MODULE_WIDGET_METRICS = {
  habits: 'habits',
  training: 'training',
  finance: 'finance',
  music: 'music',
}

function buildHomeWidgetsWithModuleVisibility(currentWidgets, moduleId, visible) {
  const byId = new Map(DEFAULT_HOME_WIDGETS.map((widget) => [widget.id, { ...widget }]))
  for (const widget of currentWidgets || []) {
    if (!widget?.id || !byId.has(widget.id)) continue
    byId.set(widget.id, { ...byId.get(widget.id), ...widget })
  }
  return [...byId.values()]
    .map((widget) => widget.module === moduleId ? { ...widget, visible } : widget)
    .sort((a, b) => a.order - b.order)
}

function buildWidgetLayoutForModules(currentLayout, modules) {
  const metrics = DEFAULT_WIDGET_LAYOUT.today.metrics.filter((metric) => {
    const moduleId = Object.entries(MODULE_WIDGET_METRICS).find(([, value]) => value === metric)?.[0]
    if (!moduleId) return false
    const module = modules[moduleId]
    return module?.enabled !== false && module?.showOnWidgets !== false
  })
  return {
    ...currentLayout,
    today: {
      ...(currentLayout?.today || {}),
      metrics,
    },
  }
}

function ModuleSettingsSection() {
  const { prefs, updatePrefs } = usePreferences()
  const normalized = getFeatureModulePreferences(prefs)
  const homeByModule = new Map(normalized.homeLayout.widgets.map((widget) => [widget.module, widget]))

  function updateModule(moduleId, patch) {
    const currentModule = normalized.featureModules[moduleId] || {}
    const nextModules = {
      ...normalized.featureModules,
      [moduleId]: {
        ...currentModule,
        ...patch,
      },
    }
    const updates = { featureModules: nextModules }

    if (Object.prototype.hasOwnProperty.call(patch, 'showOnHome')) {
      updates.homeLayout = {
        widgets: buildHomeWidgetsWithModuleVisibility(normalized.homeLayout.widgets, moduleId, patch.showOnHome),
      }
    }
    if (
      Object.prototype.hasOwnProperty.call(patch, 'showOnWidgets') ||
      Object.prototype.hasOwnProperty.call(patch, 'enabled')
    ) {
      updates.widgetLayout = buildWidgetLayoutForModules(normalized.widgetLayout, nextModules)
    }

    updatePrefs(updates)
  }

  function resetDefaults() {
    updatePrefs({
      featureModules: null,
      homeLayout: null,
      widgetLayout: null,
    })
  }

  return (
    <section className="native-settings-card module-settings-card">
      <div className="module-settings-card__header">
        <div>
          <h2>Modules and Home</h2>
          <p>Choose which product areas exist in the app, then decide whether they appear on Today and Android widgets.</p>
        </div>
        <button type="button" className="native-secondary-button" onClick={resetDefaults}>
          Reset
        </button>
      </div>
      <div className="module-settings-list">
        {FEATURE_MODULES.map((module) => {
          const modulePrefs = normalized.featureModules[module.id]
          const enabled = modulePrefs?.enabled !== false
          const homeVisible = enabled && modulePrefs?.showOnHome !== false && homeByModule.get(module.id)?.visible !== false
          const widgetsVisible = enabled && modulePrefs?.showOnWidgets !== false
          const syncEnabled = enabled && modulePrefs?.syncEnabled !== false

          return (
            <article className={`module-settings-row module-settings-row--${enabled ? 'enabled' : 'disabled'}`} key={module.id}>
              <div className="module-settings-row__title">
                <span>{module.label}</span>
                <strong>{enabled ? 'Active' : 'Hidden'}</strong>
              </div>
              <NativePreferenceToggle
                enabled={enabled}
                label="Feature active"
                description={enabled ? 'Shown in navigation and available to use.' : 'Hidden from navigation, home, widgets, and sync.'}
                onChange={(next) => updateModule(module.id, {
                  enabled: next,
                  showOnHome: next ? modulePrefs.showOnHome : false,
                  showOnWidgets: next ? modulePrefs.showOnWidgets : false,
                  syncEnabled: next ? modulePrefs.syncEnabled : false,
                })}
              />
              <div className="module-settings-row__subgrid">
                <NativePreferenceToggle
                  enabled={homeVisible}
                  label="Today"
                  description="Show on the home screen."
                  onChange={(next) => updateModule(module.id, { showOnHome: next })}
                />
                <NativePreferenceToggle
                  enabled={widgetsVisible}
                  label="Widgets"
                  description="Allow this module on Android widgets."
                  onChange={(next) => updateModule(module.id, { showOnWidgets: next })}
                />
                <NativePreferenceToggle
                  enabled={syncEnabled}
                  label="Background"
                  description="Fetch and refresh this module automatically."
                  onChange={(next) => updateModule(module.id, { syncEnabled: next })}
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function NativeNotificationsSection() {
  const { prefs } = usePreferences()
  const showHabits = isFeatureEnabled(prefs, 'habits')
  const showTraining = isFeatureEnabled(prefs, 'training')
  const showFinance = isFeatureEnabled(prefs, 'finance')
  const showAssistant = isFeatureEnabled(prefs, 'assistant')
  const [preferences, setPreferences] = useState(() => readNotificationPreferences())
  const [notificationStatus, setNotificationStatus] = useState({
    supported: true,
    permission: 'unknown',
    enabled: true,
    exact: 'unknown',
    canDisplay: false,
    canScheduleReminders: false,
  })
  const [message, setMessage] = useState('Ready')

  useEffect(() => {
    let ignore = false
    getNativeNotificationStatus()
      .then((status) => { if (!ignore) setNotificationStatus(status) })
      .catch(() => { if (!ignore) setNotificationStatus((current) => ({ ...current, permission: 'unsupported', supported: false })) })
    return () => { ignore = true }
  }, [])

  async function requestPermission() {
    const result = await initializeNativeNotifications({ requestIfPrompt: true })
    setNotificationStatus({
      supported: result.supported !== false,
      permission: result.permission || 'unsupported',
      enabled: result.enabled !== false,
      exact: result.exact || 'unknown',
      canDisplay: result.canDisplay === true,
      canScheduleReminders: result.canScheduleReminders === true,
      exactAlarmBlocked: result.exactAlarmBlocked === true,
    })
    setMessage(result.canDisplay ? 'Notifications enabled on this phone.' : 'Android did not grant notification delivery.')
  }

  async function sendTest() {
    const delivered = await deliverCustomNotification({
      id: `settings-test-${Date.now()}`,
      nativeId: 520099,
      title: 'Personal Server',
      body: 'Notifications are working on this phone.',
      actionUrl: '/settings?section=notifications',
    }).catch(() => false)
    setMessage(delivered ? 'Test notification sent.' : 'Test notification could not be delivered.')
    const latest = await getNativeNotificationStatus().catch(() => null)
    if (latest) setNotificationStatus(latest)
  }

  async function openExactSettings() {
    const opened = await openExactNotificationSettings().catch(() => false)
    setMessage(opened ? 'Android opened exact alarm settings.' : 'Exact alarm settings are unavailable on this Android version.')
  }

  return (
    <section className="native-settings-card">
      <div className="native-status-strip">
        <span>Permission</span>
        <strong>{notificationStatus.canDisplay ? 'ready' : notificationStatus.permission}</strong>
      </div>
      <div className="native-status-strip">
        <span>Exact reminders</span>
        <strong>{notificationStatus.exactAlarmBlocked ? 'needs Android setting' : notificationStatus.exact}</strong>
      </div>
      <div className="native-settings-actions">
        <button type="button" className="native-primary-button" onClick={requestPermission}>
          <Icon name="bell" size={18} />
          Enable notifications
        </button>
        <button type="button" className="native-secondary-button" onClick={sendTest} disabled={!notificationStatus.canDisplay}>
          <Icon name="bell-ring" size={18} />
          Send test
        </button>
        <button type="button" className="native-secondary-button" onClick={openExactSettings} disabled={!notificationStatus.exactAlarmBlocked}>
          <Icon name="clock" size={18} />
          Reminder alarms
        </button>
      </div>
      <div className="native-status-strip">
        <span>Last action</span>
        <strong>{message}</strong>
      </div>
      <div className="native-toggle-list">
        {showHabits && <NativeNotificationPreferenceRow id="habitReminders" label="Habit reminders" description="Daily reminders to log habits." preferences={preferences} setPreferences={setPreferences} />}
        {showHabits && <NativeNotificationPreferenceRow id="missedHabits" label="Missed habit nudges" description="Follow-up reminders when habits remain open." preferences={preferences} setPreferences={setPreferences} timeLabel="Nudge time" />}
        {showTraining && <NativeNotificationPreferenceRow id="workouts" label="Workout reminders" description="Training prompts and active workout nudges." preferences={preferences} setPreferences={setPreferences} />}
        {showFinance && <NativeNotificationPreferenceRow id="finance" label="Finance reminders" description="Budget, subscription, and import completion alerts." preferences={preferences} setPreferences={setPreferences} />}
        {showAssistant && <NativeNotificationPreferenceRow id="assistant" label="Assistant replies" description="Notify when the AI assistant responds." preferences={preferences} setPreferences={setPreferences} />}
        {showAssistant && <NativeNotificationPreferenceRow id="assistantCustom" label="AI custom alerts" description="Allow the assistant to write contextual notifications for you." preferences={preferences} setPreferences={setPreferences} />}
        <NativeNotificationPreferenceRow id="updates" label="App updates" description="APK release and required update notices." preferences={preferences} setPreferences={setPreferences} />
        <div className="native-quiet-hours">
          <div>
            <strong>Quiet hours</strong>
            <small>Suppress non-critical nudges during this window.</small>
          </div>
          <label className="native-time-field">
            <span>Start</span>
            <input
              type="time"
              aria-label="Quiet hours start"
              value={preferences.quietHours.start}
              onChange={(event) => setPreferences(updateNotificationQuietHours(localStorage, { start: event.target.value }))}
            />
          </label>
          <label className="native-time-field">
            <span>End</span>
            <input
              type="time"
              aria-label="Quiet hours end"
              value={preferences.quietHours.end}
              onChange={(event) => setPreferences(updateNotificationQuietHours(localStorage, { end: event.target.value }))}
            />
          </label>
        </div>
      </div>
    </section>
  )
}

function NativeWidgetsSection() {
  const [status, setStatus] = useState({
    supported: false,
    pinningSupported: false,
    lockScreenEligible: false,
    lockScreenAvailability: 'Checking widget support...',
  })
  const [message, setMessage] = useState('Ready')

  async function refreshStatus() {
    const next = await getAndroidWidgetStatus().catch(() => ({
      supported: false,
      pinningSupported: false,
      lockScreenEligible: false,
      lockScreenAvailability: 'Widget bridge is unavailable.',
    }))
    setStatus(next)
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  async function refreshWidgets() {
    const refreshed = await refreshAndroidWidgets().catch(() => false)
    setMessage(refreshed ? 'Widgets refreshed from the latest local snapshot.' : 'Open Today once to create a local widget snapshot.')
  }

  async function pinWidget(widget) {
    const result = await pinAndroidWidget(widget).catch((error) => ({ requested: false, reason: error.message }))
    setMessage(result?.requested ? 'Android opened the home-screen widget pin prompt.' : (result?.reason || 'Widget pinning is unavailable on this launcher.'))
  }

  return (
    <section className="native-settings-card">
      <div className="native-status-strip">
        <span>Widget bridge</span>
        <strong>{status.supported ? 'Available' : 'Unavailable'}</strong>
      </div>

      <div className="native-integration-stack">
        <article className="native-integration-card">
          <div>
            <h2>Home-screen widgets</h2>
            <p>Today and Habits widgets render from the cached mobile snapshot, so they do not wait on a live API request.</p>
          </div>
          <div className="native-settings-actions">
            <button type="button" className="native-primary-button" onClick={() => pinWidget('today')} disabled={!status.pinningSupported}>
              <Icon name="layout-dashboard" size={18} />
              Pin Today
            </button>
            <button type="button" className="native-secondary-button" onClick={() => pinWidget('habits')} disabled={!status.pinningSupported}>
              <Icon name="heart-pulse" size={18} />
              Pin Habits
            </button>
            <button type="button" className="native-secondary-button" onClick={refreshWidgets}>
              <Icon name="refresh-cw" size={18} />
              Refresh widgets
            </button>
          </div>
        </article>

        <article className="native-integration-card">
          <div>
            <h2>Lock-screen widgets</h2>
            <p>Personal Server includes a compact, privacy-safe keyguard widget. Samsung One UI on the S24 Ultra may still only expose Samsung-approved lock-screen widgets until Samsung enables broader third-party support.</p>
          </div>
          <div className="native-status-strip">
            <span>Eligibility</span>
            <strong>{status.lockScreenEligible ? 'Declared' : 'Not declared'}</strong>
          </div>
          <div className="native-info-list">
            <span>{status.lockScreenAvailability}</span>
            <span>The lock-screen widget does not show spending, streams, raw messages, or other sensitive data.</span>
            <span>Use Samsung Lock screen settings first; if Personal Server is not listed, this is an OS/OEM restriction rather than an app bug.</span>
          </div>
        </article>
      </div>

      <div className="native-toggle-list">
        <NativePreferenceToggle storageKey="widgets:today" label="Today widget updates" description="Keep the Today widget refreshed after dashboard syncs." />
        <NativePreferenceToggle storageKey="widgets:habits" label="Habits widget updates" description="Refresh habit progress after logging." />
        <NativePreferenceToggle storageKey="widgets:lock-screen" label="Lock-screen safe summary" description="Allow the compact keyguard-safe widget metadata." />
      </div>

      <div className="native-status-strip">
        <span>Last action</span>
        <strong>{message}</strong>
      </div>
    </section>
  )
}

function NativeIntegrationsSection() {
  const { prefs } = usePreferences()
  const showTraining = isFeatureEnabled(prefs, 'training')
  const showFinance = isFeatureEnabled(prefs, 'finance')
  const [health, setHealth] = useState({ status: 'checking', available: false, action: 'unsupported' })
  const [activity, setActivity] = useState({ today: null, week: { steps: 0, daysWithData: 0 }, recent: [] })
  const [payments, setPayments] = useState({ supported: false, enabled: false, notificationAccess: false, pendingCount: 0 })
  const [stepPreferences, setStepPreferences] = useState(() => readStepSyncPreferences())
  const [stepSync, setStepSync] = useState({ supported: false, enabled: false, scheduled: false })
  const [status, setStatus] = useState('Ready')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const [healthStatus, paymentStatus, activityStatus, nativeStepSync] = await Promise.all([
      showTraining ? getHealthConnectStatus() : Promise.resolve(null),
      showFinance ? getPaymentDetectionStatus() : Promise.resolve(null),
      showTraining ? getSyncedActivityMetrics({ days: 7 }).catch(() => null) : Promise.resolve(null),
      showTraining ? getNativeStepSyncStatus().catch(() => null) : Promise.resolve(null),
    ])
    if (healthStatus) setHealth(healthStatus)
    if (paymentStatus) setPayments(paymentStatus)
    if (activityStatus) setActivity(activityStatus)
    if (nativeStepSync) setStepSync(nativeStepSync)
  }

  useEffect(() => {
    refresh()
  }, [showTraining, showFinance])

  async function requestHealth() {
    setBusy(true)
    setStatus('Requesting Health Connect step permission...')
    try {
      const result = await requestHealthConnectPermissions()
      if (result.granted) {
        setStatus('Health Connect permission granted. Syncing recent steps...')
        const synced = await syncHealthConnectSteps({ days: 30 })
        setStatus(`Health Connect ready. Synced ${synced.imported || 0} daily step records.`)
        const configured = await configureNativeStepSync({ preferences: stepPreferences }).catch(() => null)
        if (configured) setStepSync(configured)
        await checkDataValidity()
        const latest = await getSyncedActivityMetrics({ days: 7 }).catch(() => null)
        if (latest) setActivity(latest)
      } else {
        setStatus('Health Connect permission was not granted.')
      }
      await refresh()
    } catch (error) {
      setStatus(error.message || 'Could not request Health Connect permission.')
    } finally {
      setBusy(false)
    }
  }

  async function syncSteps() {
    setBusy(true)
    setStatus('Reading daily steps from Health Connect...')
    try {
      const result = await syncHealthConnectSteps({ days: 30 })
      setStatus(`Synced ${result.imported || 0} daily step records.`)
      await checkDataValidity()
      const latest = await getSyncedActivityMetrics({ days: 7 }).catch(() => null)
      if (latest) setActivity(latest)
    } catch (error) {
      setStatus(error.message || 'Could not sync Health Connect steps.')
    } finally {
      setBusy(false)
    }
  }

  async function updateStepSync(patch) {
    const next = writeStepSyncPreferences(localStorage, patch)
    setStepPreferences(next)
    if (patch.liveEnabled === false) {
      stopLiveStepUpdates().catch(() => {})
    }
    const configured = await configureNativeStepSync({ preferences: next }).catch((error) => ({
      supported: false,
      enabled: false,
      scheduled: false,
      lastError: error.message,
    }))
    setStepSync(configured)
    setStatus(next.backgroundEnabled
      ? 'Background step sync configured. Android will run it periodically when constraints allow.'
      : 'Background step sync disabled. Live in-app steps can still run when enabled.')
  }

  async function togglePaymentDetection() {
    setBusy(true)
    try {
      const next = await configurePaymentDetection({ enabled: !payments.enabled, packages: payments.packages || [] })
      setPayments(next)
      setStatus(next.enabled ? 'Payment detection enabled. Android notification access is still required.' : 'Payment detection disabled.')
    } catch (error) {
      setStatus(error.message || 'Could not update payment detection.')
    } finally {
      setBusy(false)
    }
  }

  async function importPendingPayments() {
    setBusy(true)
    setStatus('Importing locally detected payment suggestions...')
    try {
      const synced = await syncNativePaymentSuggestions()
      setStatus(`Imported ${synced.length} pending payment suggestions.`)
      await refresh()
      await checkDataValidity()
    } catch (error) {
      setStatus(error.message || 'Could not import pending payment suggestions.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="native-settings-card">
      <div className="native-status-strip">
        <span>Integration status</span>
        <strong>{status}</strong>
      </div>

      <div className="native-integration-stack">
        {showTraining && (
        <article className="native-integration-card">
          <div>
            <h2>Health Connect</h2>
            <p>Sync daily steps so habits, workouts, widgets, and Today can update without waiting on a live API read.</p>
          </div>
          <div className="native-status-strip">
            <span>Status</span>
            <strong>{health.permissionsGranted ? 'Ready' : health.available ? 'Permission needed' : health.status}</strong>
          </div>
          <div className="native-status-strip">
            <span>Background sync</span>
            <strong>{stepSync.enabled ? (stepSync.scheduled ? `Every ${stepSync.intervalMinutes} min` : 'Enabled') : 'Off'}</strong>
          </div>
          <div className="native-health-summary">
            <div>
              <span>Today</span>
              <strong>{activity.today?.steps ?? 0}</strong>
              <small>steps</small>
            </div>
            <div>
              <span>7 days</span>
              <strong>{activity.week?.steps ?? 0}</strong>
              <small>{activity.week?.daysWithData ?? 0} days synced</small>
            </div>
          </div>
          <div className="native-settings-actions">
            <button type="button" className="native-primary-button" onClick={requestHealth} disabled={busy || !health.available}>
              <Icon name="activity" size={18} />
              Allow steps
            </button>
            <button type="button" className="native-secondary-button" onClick={syncSteps} disabled={busy || !health.permissionsGranted}>
              <Icon name="refresh-cw" size={18} />
              Sync 30 days
            </button>
            <button type="button" className="native-secondary-button" onClick={openHealthConnectSettings}>
              <Icon name="settings" size={18} />
              Health settings
            </button>
          </div>
          <div className="native-toggle-list">
            <NativePreferenceToggle
              enabled={stepPreferences.liveEnabled}
              label="Live in-app steps"
              description="Stream step changes while Personal Server is open."
              onChange={(liveEnabled) => updateStepSync({ liveEnabled })}
            />
            <NativePreferenceToggle
              enabled={stepPreferences.backgroundEnabled}
              label="Background step sync"
              description="Let Android periodically sync Health Connect steps while the app is closed."
              onChange={(backgroundEnabled) => updateStepSync({ backgroundEnabled })}
            />
          </div>
          <div className="native-info-list">
            <span>Live mode is instant while the app is open.</span>
            <span>Background mode uses Android WorkManager, so runs are periodic and battery-aware rather than continuous.</span>
            {stepSync.lastError && <span>Last background issue: {stepSync.lastError}</span>}
          </div>
        </article>
        )}

        {showFinance && (
        <article className="native-integration-card">
          <div>
            <h2>Payment prompts</h2>
            <p>Watch payment-like bank or wallet notifications locally, then show pending finance suggestions for confirmation.</p>
          </div>
          <div className="native-status-strip">
            <span>Detection</span>
            <strong>{payments.enabled ? (payments.notificationAccess ? 'Active' : 'Needs notification access') : 'Off'}</strong>
          </div>
          <div className="native-settings-actions">
            <button type="button" className={payments.enabled ? 'native-secondary-button' : 'native-primary-button'} onClick={togglePaymentDetection} disabled={busy}>
              <Icon name={payments.enabled ? 'pause' : 'wallet'} size={18} />
              {payments.enabled ? 'Disable' : 'Enable'}
            </button>
            <button type="button" className="native-secondary-button" onClick={openPaymentNotificationSettings}>
              <Icon name="bell" size={18} />
              Notification access
            </button>
            <button type="button" className="native-secondary-button" onClick={importPendingPayments} disabled={busy}>
              <Icon name="download" size={18} />
              Import pending
            </button>
          </div>
          <div className="native-info-list">
            <span>{payments.pendingCount || 0} local suggestions waiting on this phone.</span>
            <span>Raw notification text stays local; only amount, merchant, app, and time are synced.</span>
          </div>
        </article>
        )}
        {!showTraining && !showFinance && (
          <article className="native-integration-card">
            <div>
              <h2>No active integrations</h2>
              <p>Enable Training or Money in Modules and Home to use Health Connect or payment prompts.</p>
            </div>
          </article>
        )}
      </div>
    </section>
  )
}

function NativeSyncSection() {
  const [status, setStatus] = useState('Ready to check')

  async function refresh() {
    setStatus('Checking backend watermarks...')
    const result = await checkDataValidity().catch(() => null)
    if (!result) {
      setStatus('Could not reach the API. Local cache remains available.')
      return
    }
    setStatus(result.changed ? 'Remote changes found. Local sections will refresh.' : 'Local cache matches backend watermarks.')
  }

  function clearLocalCache() {
    clearApiCache()
    setStatus('Local API cache cleared. Pages will reload from the backend when opened.')
  }

  return (
    <section className="native-settings-card">
      <div className="native-status-strip">
        <span>Sync state</span>
        <strong>{status}</strong>
      </div>
      <div className="native-settings-actions">
        <button type="button" className="native-primary-button" onClick={refresh}>
          <Icon name="refresh-cw" size={18} />
          Check now
        </button>
        <button type="button" className="native-secondary-button" onClick={clearLocalCache}>
          <Icon name="trash-2" size={18} />
          Clear cache
        </button>
      </div>
      <div className="native-info-list">
        <span>Cached reads render immediately and refresh in the background.</span>
        <span>Watermarks invalidate stale domains when data changes on web.</span>
        <span>Failed refreshes keep the last local copy visible.</span>
      </div>
    </section>
  )
}

function NativeUpdatesSection() {
  const [status, setStatus] = useState('Not checked in this view')
  const [update, setUpdate] = useState(null)

  async function checkUpdate() {
    setStatus('Checking app version policy...')
    const next = await checkForAndroidUpdate({ force: true })
    setUpdate(next)
    setStatus(next ? `Update available: ${next.version}` : 'Installed APK is current or no APK release was found.')
  }

  async function installUpdate() {
    if (!update) {
      setStatus('Check for an update first.')
      return
    }
    setStatus('Preparing APK installer...')
    const result = await installAndroidUpdate(update).catch((error) => ({
      started: false,
      message: error.message,
    }))
    if (result?.needsPermission) {
      setStatus('Allow Personal Server to install unknown apps, then try again.')
      return
    }
    setStatus(result?.started === false ? (result?.message || 'Installer could not start.') : 'Android installer opened.')
  }

  return (
    <section className="native-settings-card">
      <div className="settings-version-card">
        <div>
          <span>Installed</span>
          <strong>v{APP_VERSION}</strong>
        </div>
        <div>
          <span>Build</span>
          <strong>{formatBuildTime(APP_BUILD_TIME)}</strong>
        </div>
      </div>
      <div className="native-status-strip">
        <span>Release check</span>
        <strong>{status}</strong>
      </div>
      <div className="native-settings-actions">
        <button type="button" className="native-primary-button" onClick={checkUpdate}>
          <Icon name="refresh-cw" size={18} />
          Check update
        </button>
        <button type="button" className="native-secondary-button" onClick={installUpdate} disabled={!update}>
          <Icon name="download" size={18} />
          Install
        </button>
      </div>
      {update?.changelog && (
        <div className="native-info-list">
          {(update.changelog.features || []).slice(0, 4).map((item, index) => (
            <span key={`feature-${index}`}>{item}</span>
          ))}
        </div>
      )}
    </section>
  )
}

function NativePreferencesSection({ currentLanguage, changeLanguage, t }) {
  return (
    <section className="native-settings-card">
      <h2>{t('settings.preferences')}</h2>
      <p>{t('settings.languageDesc')}</p>
      <div className="native-settings-actions">
        <button
          type="button"
          className={currentLanguage === 'en' ? 'native-primary-button' : 'native-secondary-button'}
          onClick={() => changeLanguage('en')}
        >
          EN
        </button>
        <button
          type="button"
          className={currentLanguage === 'es' ? 'native-primary-button' : 'native-secondary-button'}
          onClick={() => changeLanguage('es')}
        >
          ES
        </button>
      </div>
    </section>
  )
}

function NativeSettings({ activeSection, setActiveSection, spotifyError, currentLanguage, changeLanguage, t }) {
  const back = () => setActiveSection('')
  if (!activeSection) return <NativeSettingsIndex onSelect={setActiveSection} />

  const meta = NATIVE_SETTINGS_SECTIONS.find((item) => item.key === activeSection) || NATIVE_SETTINGS_SECTIONS[0]

  return (
    <NativeSettingsShell title={meta.label} description={meta.description} icon={meta.icon} onBack={back}>
      {activeSection === 'account' && <Account />}
      {activeSection === 'connections' && <Connections initialError={spotifyError} />}
      {activeSection === 'integrations' && <NativeIntegrationsSection />}
      {activeSection === 'modules' && <ModuleSettingsSection />}
      {activeSection === 'notifications' && <NativeNotificationsSection />}
      {activeSection === 'widgets' && <NativeWidgetsSection />}
      {activeSection === 'sync' && <NativeSyncSection />}
      {activeSection === 'updates' && <NativeUpdatesSection />}
      {activeSection === 'appearance' && <Appearance />}
      {activeSection === 'data' && <DataManagement />}
      {activeSection === 'agent-keys' && <AgentApiKeys />}
      {activeSection === 'preferences' && (
        <NativePreferencesSection currentLanguage={currentLanguage} changeLanguage={changeLanguage} t={t} />
      )}
    </NativeSettingsShell>
  )
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const requestedSection = searchParams.get('section')
  const spotifyError = searchParams.get('spotify_error') || ''
  const nativeApp = isNativeMobileApp()
  const [activeTab, setActiveTab] = useState(
    spotifyError ? 'connections' : normalizeTab(requestedTab)
  )
  const [activeNativeSection, setActiveNativeSection] = useState(
    spotifyError ? 'connections' : (requestedSection || '')
  )

  useEffect(() => {
    if (spotifyError) {
      setActiveTab('connections')
      setActiveNativeSection('connections')
      return
    }
    if (requestedTab) setActiveTab(normalizeTab(requestedTab))
    setActiveNativeSection(requestedSection || '')
  }, [requestedTab, requestedSection, spotifyError])

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
  }

  const currentLanguage = i18n.language

  function setNativeSection(section) {
    setActiveNativeSection(section)
    if (section) setSearchParams({ section })
    else setSearchParams({})
  }

  if (nativeApp) {
    return (
      <NativeSettings
        activeSection={activeNativeSection}
        setActiveSection={setNativeSection}
        spotifyError={spotifyError}
        currentLanguage={currentLanguage}
        changeLanguage={changeLanguage}
        t={t}
      />
    )
  }

  return (
    <>
      <PageHeader icon="settings" title="Settings" />

      <div className="tab-group" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <Icon name="user" size={16} style={{ marginRight: '4px' }} />
          Account
        </button>
        <button
          className={`tab-btn ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          <Icon name="link" size={16} style={{ marginRight: '4px' }} />
          {t('settings.connections')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'agent-keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent-keys')}
        >
          <Icon name="key-round" size={16} style={{ marginRight: '4px' }} />
          {t('settings.agentApiKeys')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          <Icon name="palette" size={16} style={{ marginRight: '4px' }} />
          Appearance
        </button>
        <button
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Icon name="sliders-horizontal" size={16} style={{ marginRight: '4px' }} />
          {t('settings.preferences')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'modules' ? 'active' : ''}`}
          onClick={() => setActiveTab('modules')}
        >
          <Icon name="sliders-horizontal" size={16} style={{ marginRight: '4px' }} />
          Modules
        </button>
        <button
          className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          <Icon name="database" size={16} style={{ marginRight: '4px' }} />
          Data
        </button>
      </div>

      {activeTab === 'account' && <Account />}

      {activeTab === 'agent-keys' && <AgentApiKeys />}

      {activeTab === 'connections' && <Connections initialError={spotifyError} />}

      {activeTab === 'appearance' && <Appearance />}

      {activeTab === 'data' && <DataManagement />}

      {activeTab === 'modules' && <ModuleSettingsSection />}

      {activeTab === 'preferences' && (
        <div className="card section">
          <h2>{t('settings.preferences')}</h2>

          {/* Language Selector */}
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
              <Icon name="globe" size={18} style={{ marginRight: '0.5rem' }} />
              {t('settings.language')}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {t('settings.languageDesc')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className={`btn ${currentLanguage === 'en' ? '' : 'btn-ghost'}`}
                onClick={() => changeLanguage('en')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '120px',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>EN</span>
                {t('settings.english')}
              </button>
              <button
                className={`btn ${currentLanguage === 'es' ? '' : 'btn-ghost'}`}
                onClick={() => changeLanguage('es')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '120px',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>ES</span>
                {t('settings.spanish')}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              {t('settings.themeDesc')}
            </p>
          </div>

          <div className="settings-version-card">
            <div>
              <span>App version</span>
              <strong>v{APP_VERSION}</strong>
            </div>
            <div>
              <span>Build</span>
              <strong>{formatBuildTime(APP_BUILD_TIME)}</strong>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
