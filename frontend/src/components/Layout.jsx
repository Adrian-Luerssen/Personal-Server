import React, { lazy, Suspense, useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import ApiStatus from './ApiStatus'
import PageTransition from './PageTransition'
import RouteErrorBoundary from './RouteErrorBoundary'
import { api, checkDataValidity, preloadDashboardData } from '../api'
import PWAInstallPrompt from './PWAInstallPrompt'
import { isNativeMobileApp } from '../mobilePlatform'
import { usePreferences } from '../contexts/PreferencesContext'
import { FEATURE_MODULES, getModuleIdForPath, isFeatureEnabled, isFeatureSyncEnabled } from '../modulePreferences.mjs'
import Icon from './icons/Icon'
import CaptureSheet from './product/CaptureSheet'
import DomainNav from './product/DomainNav'
import MobileGlobalNav from './product/MobileGlobalNav'
import ProductHeader from './product/ProductHeader'
import { getCaptureActions } from '../product/capture.mjs'
import { checkForAndroidUpdate, dismissAndroidUpdate } from '../appUpdate'
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
import { getNativeBackDestination } from '../nativeNavigation.mjs'

const ChatPanel = lazy(() => import('./ChatPanel'))

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

function DisabledFeatureState({ moduleId, onEnable }) {
  const module = FEATURE_MODULES.find((item) => item.id === moduleId)
  const label = module?.label || 'Feature'

  return (
    <section className="disabled-feature-state">
      <Icon name={module?.icon || 'sliders-horizontal'} size={24} />
      <div>
        <span>Hidden module</span>
        <h1>{label} is turned off</h1>
        <p>This area is hidden from navigation, home, widgets, notifications, and background sync until you enable it again.</p>
      </div>
      <button type="button" className="btn" onClick={onEnable}>
        Enable {label}
      </button>
    </section>
  )
}

export default function Layout() {
  const nativeApp = isNativeMobileApp()
  const location = useLocation()
  const navigate = useNavigate()
  const { prefs, updatePrefs } = usePreferences()
  const [collapsed, setCollapsed] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const enabledCaptureModules = ['finance', 'training', 'habits', 'media']
    .filter((moduleId) => isFeatureEnabled(prefs, moduleId))
  const captureActions = getCaptureActions({ enabled: enabledCaptureModules })
  const disabledRouteModule = getModuleIdForPath(location.pathname)
  const routeDisabled = disabledRouteModule && !isFeatureEnabled(prefs, disabledRouteModule)
  function enableCurrentModule() {
    if (!disabledRouteModule) return
    updatePrefs({
      featureModules: {
        ...prefs.featureModules,
        [disabledRouteModule]: {
          ...(prefs.featureModules?.[disabledRouteModule] || {}),
          enabled: true,
          syncEnabled: true,
        },
      },
    })
  }

  // Preload dashboard data on app mount so pages load instantly
  useEffect(() => {
    preloadDashboardData(prefs)

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
  }, [nativeApp, prefs])

  useEffect(() => {
    if (!nativeApp) return undefined
    if (!isFeatureSyncEnabled(prefs, 'assistant')) return undefined
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
  }, [nativeApp, prefs])

  useEffect(() => {
    if (!nativeApp) return undefined
    if (!isFeatureSyncEnabled(prefs, 'training')) {
      stopLiveStepUpdates().catch(() => {})
      return undefined
    }
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
  }, [nativeApp, prefs])

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
    <div className={"layout product-shell" + (collapsed ? ' sidebar-collapsed' : '')}>
      {nativeApp && <ProductHeader native onCapture={() => setCaptureOpen(true)} />}
      {!nativeApp && <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />}
      <main className="content">
        {!nativeApp && <ProductHeader onCapture={() => setCaptureOpen(true)} />}
        <div className="content-shell">
          <DomainNav />
          <div className="content-shell__frame">
            <PageTransition>
              <RouteErrorBoundary key={location.pathname}>
                {routeDisabled ? (
                  <DisabledFeatureState moduleId={disabledRouteModule} onEnable={enableCurrentModule} />
                ) : (
                  <Outlet />
                )}
              </RouteErrorBoundary>
            </PageTransition>
          </div>
        </div>
      </main>
      <ApiStatus />
      {nativeApp && <NativeUpdatePrompt />}
      {nativeApp && <MobileGlobalNav onCapture={() => setCaptureOpen(true)} />}
      {(
        <CaptureSheet
          actions={captureActions}
          open={captureOpen}
          onClose={() => setCaptureOpen(false)}
          onSelect={(action) => {
            setCaptureOpen(false)
            navigate(action.to)
          }}
        />
      )}
      {!nativeApp && <Suspense fallback={null}><ChatPanel /></Suspense>}
      {!nativeApp && <PWAInstallPrompt />}
    </div>
  )
}
