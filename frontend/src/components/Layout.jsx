import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import ApiStatus from './ApiStatus'
import GradientMesh from './GradientMesh'
import PageTransition from './PageTransition'
import RouteErrorBoundary from './RouteErrorBoundary'
import { api, checkDataValidity, preloadDashboardData } from '../api'
import PWAInstallPrompt from './PWAInstallPrompt'
import { isNativeMobileApp } from '../mobilePlatform'
import Icon from './icons/Icon'
import { checkForAndroidUpdate, dismissAndroidUpdate } from '../appUpdate'
import { APP_VERSION } from '../appVersion.mjs'
import { pollPendingAiNotifications } from '../aiNotifications.mjs'
import {
  LIVE_STEP_SYNC_INTERVAL_MS,
  STEP_SYNC_PREFERENCES_EVENT,
  configureNativeStepSync,
  getSyncedActivityMetrics,
  maybeAutoSyncHealthConnectSteps,
  readStepSyncPreferences,
  shouldStartLiveStepStream,
  startLiveStepUpdates,
  stopLiveStepUpdates,
  subscribeToLiveStepUpdates,
  syncLiveStepSnapshot,
} from '../nativeHealth.mjs'
import {
  getNativeAppForPath,
  getNativeAppSwitcherOptions,
  getNativeBackDestination,
  getNativeTabsForPath,
} from '../nativeNavigation.mjs'

const NATIVE_ROUTE_TITLES = [
  { match: /^\/home$/, title: 'Today', subtitle: 'Overview' },
  { match: /^\/menu/, title: 'Menu', subtitle: 'App map' },
  { match: /^\/workout/, title: 'Training', subtitle: 'Workout log' },
  { match: /^\/habits/, title: 'Habits', subtitle: 'Daily routines' },
  { match: /^\/finance/, title: 'Money', subtitle: 'Spending and wallets' },
  { match: /^\/spotify/, title: 'Music', subtitle: 'Spotify insights' },
  { match: /^\/media/, title: 'Media', subtitle: 'Library' },
  { match: /^\/chat/, title: 'Assistant', subtitle: 'AI copilot' },
  { match: /^\/settings/, title: 'Settings', subtitle: 'Account and app' },
]

function NativeAppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false)
  const currentApp = getNativeAppForPath(location.pathname)
  const appSwitcherOptions = getNativeAppSwitcherOptions(location.pathname)
  const isSettingsRoute = location.pathname.startsWith('/settings')
  const current = NATIVE_ROUTE_TITLES.find((item) => item.match.test(location.pathname)) || {
    title: 'Personal Server',
    subtitle: 'Private dashboard',
  }

  useEffect(() => {
    setAppSwitcherOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!appSwitcherOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setAppSwitcherOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [appSwitcherOpen])

  return (
    <header className="native-app-header">
      <div className="native-app-header__top">
        <div className={`native-app-header__mark native-app-header__mark--${currentApp.tone}`} aria-hidden="true">PS</div>
        <div className="native-app-header__copy">
          <span>{current.subtitle} - v{APP_VERSION}</span>
          <strong>{current.title}</strong>
        </div>
        <button
          type="button"
          className={`native-app-header__selector native-app-header__selector--${currentApp.tone}`}
          onClick={() => setAppSwitcherOpen((open) => !open)}
          aria-expanded={appSwitcherOpen}
          aria-controls="native-app-switcher-sheet"
          aria-label={`Switch app, current app ${currentApp.label}`}
        >
          <Icon name={currentApp.icon} size={16} />
          <span className="native-app-header__selector-label">Apps</span>
          <Icon name={appSwitcherOpen ? 'chevron-up' : 'chevron-down'} size={15} aria-hidden="true" />
        </button>
        {!isSettingsRoute && (
          <button
            type="button"
            className="native-app-header__button"
            onClick={() => navigate('/settings')}
            aria-label="Open settings"
          >
            <Icon name="settings" size={20} />
          </button>
        )}
      </div>
      {appSwitcherOpen && (
        <>
          <button
            type="button"
            className="native-app-sheet-backdrop"
            aria-label="Close app switcher"
            onClick={() => setAppSwitcherOpen(false)}
          />
          <section
            className="native-app-sheet"
            id="native-app-switcher-sheet"
            role="dialog"
            aria-label="Switch app"
          >
            <div className="native-app-sheet__header">
              <div>
                <span>Current app</span>
                <strong>{currentApp.label}</strong>
              </div>
              <button
                type="button"
                className="native-icon-button native-app-sheet__close"
                aria-label="Close app switcher"
                onClick={() => setAppSwitcherOpen(false)}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <nav className="native-app-sheet__grid" aria-label="Choose app">
              {appSwitcherOptions.map((app) => (
                <NavLink
                  key={app.id}
                  to={app.root}
                  className={`native-app-sheet__item native-app-sheet__item--${app.tone}`}
                  onClick={() => setAppSwitcherOpen(false)}
                >
                  <span aria-hidden="true">
                    <Icon name={app.icon} size={18} />
                  </span>
                  <strong>{app.label}</strong>
                  <small>{app.subtitle}</small>
                </NavLink>
              ))}
            </nav>
          </section>
        </>
      )}
    </header>
  )
}

function NativeUpdatePrompt() {
  const [update, setUpdate] = useState(null)

  useEffect(() => {
    let ignore = false
    checkForAndroidUpdate().then((next) => {
      if (!ignore && next) setUpdate(next)
    })
    return () => { ignore = true }
  }, [])

  if (!update) return null

  return (
    <div className="native-update-prompt" role="status">
      <div>
        <strong>APK update available</strong>
        <span>Installed v{update.currentVersion} - Latest {update.version}</span>
      </div>
      <a href={update.apkUrl} target="_blank" rel="noreferrer">Download</a>
      <button
        type="button"
        aria-label="Dismiss update"
        onClick={() => {
          dismissAndroidUpdate(update.id)
          setUpdate(null)
        }}
      >
        <Icon name="x" size={15} />
      </button>
    </div>
  )
}

export default function Layout() {
  const nativeApp = isNativeMobileApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const hasNativeTabbar = !nativeApp || getNativeTabsForPath(location.pathname).length > 0

  // Preload dashboard data on app mount so pages load instantly
  useEffect(() => {
    preloadDashboardData()

    const refreshIfChanged = () => {
      checkDataValidity()
        .then(({ changed }) => {
          if (changed && nativeApp) {
            api.get('/dashboard/mobile', { force: true }).catch(() => {})
          }
        })
        .catch(() => {})
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshIfChanged()
    }

    window.addEventListener('focus', refreshIfChanged)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const interval = nativeApp ? window.setInterval(refreshIfChanged, 120_000) : null

    return () => {
      window.removeEventListener('focus', refreshIfChanged)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (interval) window.clearInterval(interval)
    }
  }, [nativeApp])

  useEffect(() => {
    if (!nativeApp) return undefined
    let cancelled = false

    const deliver = () => {
      if (cancelled) return
      pollPendingAiNotifications().catch(() => {})
    }

    deliver()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') deliver()
    }
    window.addEventListener('focus', deliver)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const interval = window.setInterval(deliver, 60_000)

    return () => {
      cancelled = true
      window.removeEventListener('focus', deliver)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearInterval(interval)
    }
  }, [nativeApp])

  useEffect(() => {
    if (!nativeApp) return undefined
    let cancelled = false
    let unsubscribeLiveSteps = null
    let lastLivePersistAt = 0
    let lastPersistedSteps = 0

    const persistLiveStep = (event, { force = false } = {}) => {
      if (cancelled) return
      const steps = Number(event?.steps || 0)
      const now = Date.now()
      if (!force && now - lastLivePersistAt < LIVE_STEP_SYNC_INTERVAL_MS && Math.abs(steps - lastPersistedSteps) < 10) {
        return
      }
      lastLivePersistAt = now
      lastPersistedSteps = steps
      syncLiveStepSnapshot(event)
        .then((result) => {
          if (!cancelled && result && !result.skipped && (result.imported || 0) > 0) {
            checkDataValidity().catch(() => {})
            api.get('/dashboard/mobile', { force: true }).catch(() => {})
          }
        })
        .catch(() => {})
    }

    const startSteps = async () => {
      if (cancelled) return
      const preferences = readStepSyncPreferences()
      configureNativeStepSync({ preferences }).catch(() => {})
      maybeAutoSyncHealthConnectSteps({ days: 7 })
        .catch(() => {})
      if (!shouldStartLiveStepStream({ nativeApp, liveEnabled: preferences.liveEnabled })) {
        stopLiveStepUpdates().catch(() => {})
        return
      }
      const activity = await getSyncedActivityMetrics({ days: 7 }).catch(() => null)
      if (cancelled) return
      const today = new Date().toISOString().slice(0, 10)
      const baselineSteps = activity?.today?.steps || 0
      await startLiveStepUpdates({ baselineSteps, date: today }).catch(() => null)
    }

    subscribeToLiveStepUpdates((event) => persistLiveStep(event))
      .then((unsubscribe) => {
        unsubscribeLiveSteps = unsubscribe
      })
      .catch(() => {})

    startSteps()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') startSteps()
      else stopLiveStepUpdates().catch(() => {})
    }
    window.addEventListener('focus', startSteps)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener(STEP_SYNC_PREFERENCES_EVENT, startSteps)
    const interval = window.setInterval(startSteps, 10 * 60_000)

    return () => {
      cancelled = true
      unsubscribeLiveSteps?.()
      stopLiveStepUpdates().catch(() => {})
      window.removeEventListener('focus', startSteps)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener(STEP_SYNC_PREFERENCES_EVENT, startSteps)
      window.clearInterval(interval)
    }
  }, [nativeApp])

  useEffect(() => {
    if (!nativeApp) return undefined

    window.personalServerHandleNativeBack = () => {
      const destination = getNativeBackDestination(location.pathname, location.search)
      if (!destination) return false
      navigate(destination)
      return true
    }

    return () => {
      delete window.personalServerHandleNativeBack
    }
  }, [location.pathname, location.search, navigate, nativeApp])

  return (
    <div className={"layout" + (collapsed ? ' sidebar-collapsed' : '') + (nativeApp && !hasNativeTabbar ? ' native-no-tabbar' : '')}>
      <GradientMesh />
      {nativeApp && <NativeAppHeader />}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="content">
        <div className="content-shell">
          <div className="content-shell__frame">
            <PageTransition>
              <RouteErrorBoundary key={location.pathname}>
                <Outlet />
              </RouteErrorBoundary>
            </PageTransition>
          </div>
        </div>
      </main>
      <ApiStatus />
      {nativeApp && <NativeUpdatePrompt />}
      {!nativeApp && <ChatPanel />}
      {!nativeApp && <PWAInstallPrompt />}
    </div>
  )
}
