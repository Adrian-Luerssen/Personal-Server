import React, { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import ApiStatus from './ApiStatus'
import GradientMesh from './GradientMesh'
import PageTransition from './PageTransition'
import { api, checkDataValidity, preloadDashboardData } from '../api'
import PWAInstallPrompt from './PWAInstallPrompt'
import { isNativeMobileApp } from '../mobilePlatform'
import Icon from './icons/Icon'

const NATIVE_ROUTE_TITLES = [
  { match: /^\/home$/, title: 'Today', subtitle: 'Overview' },
  { match: /^\/workout/, title: 'Training', subtitle: 'Workout log' },
  { match: /^\/habits/, title: 'Habits', subtitle: 'Daily routines' },
  { match: /^\/finance/, title: 'Money', subtitle: 'Spending and wallets' },
  { match: /^\/spotify/, title: 'Music', subtitle: 'Spotify insights' },
  { match: /^\/media/, title: 'Media', subtitle: 'Library' },
  { match: /^\/settings/, title: 'Settings', subtitle: 'Account and app' },
]

function NativeAppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const current = NATIVE_ROUTE_TITLES.find((item) => item.match.test(location.pathname)) || {
    title: 'Personal Server',
    subtitle: 'Private dashboard',
  }

  return (
    <header className="native-app-header">
      <div className="native-app-header__mark" aria-hidden="true">PS</div>
      <div className="native-app-header__copy">
        <span>{current.subtitle}</span>
        <strong>{current.title}</strong>
      </div>
      <button
        type="button"
        className="native-app-header__button"
        onClick={() => navigate('/settings')}
        aria-label="Open settings"
      >
        <Icon name="settings" size={20} />
      </button>
    </header>
  )
}

export default function Layout() {
  const nativeApp = isNativeMobileApp()
  const [collapsed, setCollapsed] = useState(false)

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

  return (
    <div className={"layout" + (collapsed ? ' sidebar-collapsed' : '')}>
      <GradientMesh />
      {nativeApp && <NativeAppHeader />}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="content">
        <div className="content-shell">
          <div className="content-shell__frame">
            <PageTransition><Outlet /></PageTransition>
          </div>
        </div>
      </main>
      <ApiStatus />
      <ChatPanel />
      {!nativeApp && <PWAInstallPrompt />}
    </div>
  )
}
