import React, { useEffect, useState, useCallback } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, clearApiCache } from '../api'
import { usePreferences, useTheme } from '../contexts/PreferencesContext'
import { isFeatureEnabled, isFeatureSyncEnabled } from '../modulePreferences.mjs'
import Icon from './icons/Icon'
import { isNativeMobileApp } from '../mobilePlatform'
import {
  getNativeAppForPath,
  getNativeTabsForPath,
  isNativeDestinationActive,
} from '../nativeNavigation.mjs'

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

export default function Sidebar({ collapsed, onToggle }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { prefs } = usePreferences()
  const nativeApp = isNativeMobileApp()
  const isMobile = useIsMobile()
  const [spotifyLinked, setSpotifyLinked] = useState(null)
  const [spotifyMenuOpen, setSpotifyMenuOpen] = useState(false)
  const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false)
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false)
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false)
  const [habitsMenuOpen, setHabitsMenuOpen] = useState(false)
  const [incompleteHabits, setIncompleteHabits] = useState(0)
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false)

  useEffect(() => {
    let ignore = false
    if (isFeatureSyncEnabled(prefs, 'habits')) {
      api.get('/habits/summary')
        .then(data => {
          if (!ignore && Array.isArray(data)) {
            setIncompleteHabits(data.filter(h => h.todayStatus !== 'success').length)
          }
        })
        .catch(() => {})
    } else {
      setIncompleteHabits(0)
    }
    if (isFeatureSyncEnabled(prefs, 'training')) {
      api.get('/workout/sessions/active')
        .then(session => { if (!ignore) setHasActiveWorkout(!!session) })
        .catch(() => { if (!ignore) setHasActiveWorkout(false) })
    } else {
      setHasActiveWorkout(false)
    }
    return () => { ignore = true }
  }, [location.pathname, prefs])

  useEffect(() => {
    let ignore = false
    if (!isFeatureSyncEnabled(prefs, 'music')) {
      setSpotifyLinked(false)
      return () => { ignore = true }
    }
    api.get('/spotify/linked')
      .then(r => { if (!ignore) setSpotifyLinked(!!r?.linked) })
      .catch(() => { if (!ignore) setSpotifyLinked(false) })
    return () => { ignore = true }
  }, [location.pathname, prefs])

  useEffect(() => {
    const onSpotifyRoute = location.pathname.startsWith('/spotify')
    if (spotifyLinked && onSpotifyRoute) setSpotifyMenuOpen(true)
    if (!onSpotifyRoute) setSpotifyMenuOpen(false)
  }, [location.pathname, spotifyLinked])

  useEffect(() => {
    const onWorkoutRoute = location.pathname.startsWith('/workout')
    if (onWorkoutRoute) setWorkoutMenuOpen(true)
    else setWorkoutMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onFinanceRoute = location.pathname.startsWith('/finance')
    if (onFinanceRoute) setFinanceMenuOpen(true)
    else setFinanceMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onMediaRoute = location.pathname.startsWith('/media')
    if (onMediaRoute) setMediaMenuOpen(true)
    else setMediaMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onHabitsRoute = location.pathname.startsWith('/habits')
    if (onHabitsRoute) setHabitsMenuOpen(true)
    else setHabitsMenuOpen(false)
  }, [location.pathname])

  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    clearApiCache()
    nav(isNativeMobileApp() ? '/login' : '/', { replace: true })
  }

  const isSpotifyActive = location.pathname.startsWith('/spotify')
  const isWorkoutActive = location.pathname.startsWith('/workout')
  const isFinanceActive = location.pathname.startsWith('/finance')
  const isMediaActive = location.pathname.startsWith('/media')
  const isHabitsActive = location.pathname.startsWith('/habits')
  const showTraining = isFeatureEnabled(prefs, 'training')
  const showHabits = isFeatureEnabled(prefs, 'habits')
  const showFinance = isFeatureEnabled(prefs, 'finance')
  const showMusic = isFeatureEnabled(prefs, 'music')
  const showMedia = isFeatureEnabled(prefs, 'media')

  const handleSpotifyClick = () => {
    if (isMobile) {
      nav(spotifyLinked ? '/spotify/personal' : '/spotify/global')
      return
    }
    if (spotifyLinked) {
      setSpotifyMenuOpen(o => !o)
    } else {
      nav('/spotify/global')
    }
  }

  const handleWorkoutClick = () => {
    if (isMobile) { nav('/workout'); return }
    setWorkoutMenuOpen(o => !o)
  }

  const handleFinanceClick = () => {
    if (isMobile) { nav('/finance'); return }
    setFinanceMenuOpen(o => !o)
  }

  const handleMediaClick = () => {
    if (isMobile) { nav('/media'); return }
    setMediaMenuOpen(o => !o)
  }

  const handleHabitsClick = () => {
    if (isMobile) { nav('/habits'); return }
    setHabitsMenuOpen(o => !o)
  }

  if (nativeApp) {
    const currentApp = getNativeAppForPath(location.pathname)
    const nativeTabs = getNativeTabsForPath(location.pathname, prefs)

    if (nativeTabs.length === 0) return null

    return (
      <aside className={`sidebar native-tabbar native-tabbar--${currentApp.tone}`} aria-label={`${currentApp.label} app navigation`}>
        <nav className="nav">
          {nativeTabs.map((tab) => {
            const active = isNativeDestinationActive(tab, location.pathname, location.search)
            const dot =
              (tab.to.startsWith('/workout') && hasActiveWorkout && !location.pathname.startsWith('/workout/active')) ||
              (tab.to.startsWith('/habits') && incompleteHabits > 0 && tab.to === '/habits')
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={'nav-link native-tabbar__item' + (active ? ' active is-active' : '')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon name={tab.icon} size={21} />
                <span>{tab.label}</span>
                {dot && !active && <span className="nav-badge-dot" aria-hidden="true" />}
              </Link>
            )
          })}
        </nav>
      </aside>
    )
  }

  return (
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
      <div className="sidebar-brand-shell">
        <div className="sidebar-brand-mark">PS</div>
        {!collapsed && (
          <div className="sidebar-brand-copy">
            <div className="brand">{t('common.appName')}</div>
            <div className="sidebar-brand-note">Private review ledger</div>
          </div>
        )}
        <button className="sidebar-toggle-btn" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={collapsed ? 'panel-left-open' : 'panel-left-close'} size={16} />
        </button>
      </div>
      <nav className="nav">
        {!collapsed && <div className="sidebar-section-label">Overview</div>}
        <NavLink to="/home" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <Icon name="home" size={20} />
          {!collapsed && <span>{t('nav.home')}</span>}
        </NavLink>

        {!collapsed && <div className="sidebar-section-label">Domains</div>}
        {showMusic && (
          <>
        <div
          className={'nav-link' + (isSpotifyActive ? ' active' : '')}
          onClick={handleSpotifyClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSpotifyClick() } }}
          aria-expanded={spotifyLinked ? spotifyMenuOpen : undefined}
        >
          <Icon name="music" size={20} />
          {!collapsed && <span>{t('nav.spotify')}</span>}
          {collapsed && spotifyLinked === false && <Icon name="alert-triangle" size={14} style={{ color: 'var(--color-warning)' }} />}
        </div>
        {spotifyLinked && spotifyMenuOpen && (
          <div className="subnav" role="menu">
            <NavLink to="/spotify/personal" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="user" size={20} />
              {!collapsed && <span>{t('nav.spotifyPersonal')}</span>}
            </NavLink>
            <NavLink to="/spotify/global" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="globe" size={20} />
              {!collapsed && <span>{t('nav.spotifyGlobal')}</span>}
            </NavLink>
            <NavLink to="/spotify/ranking" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="trophy" size={20} />
              {!collapsed && <span>{t('nav.spotifyRanking')}</span>}
            </NavLink>
          </div>
        )}
          </>
        )}

        {showTraining && (
          <>
        <div
          className={'nav-link' + (isWorkoutActive ? ' active' : '')}
          onClick={handleWorkoutClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWorkoutClick() } }}
          aria-expanded={workoutMenuOpen}
        >
          <Icon name="dumbbell" size={20} />
          {!collapsed && <span>{t('nav.workout')}</span>}
          {hasActiveWorkout && <span className="nav-badge-dot" />}
        </div>
        {workoutMenuOpen && (
          <div className="subnav" role="menu">
            <NavLink to="/workout" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="layout-dashboard" size={20} />
              {!collapsed && <span>{t('nav.workoutDashboard')}</span>}
            </NavLink>
            <NavLink to="/workout/active" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="zap" size={20} />
              {!collapsed && <span>{t('nav.workoutActive')}</span>}
            </NavLink>
            <NavLink to="/workout/history" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="clock" size={20} />
              {!collapsed && <span>{t('nav.workoutHistory')}</span>}
            </NavLink>
            <NavLink to="/workout/exercises" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="list" size={20} />
              {!collapsed && <span>{t('nav.workoutExercises')}</span>}
            </NavLink>
            <NavLink to="/workout/bodyweight" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="scale" size={20} />
              {!collapsed && <span>{t('nav.workoutBodyweight')}</span>}
            </NavLink>
          </div>
        )}
          </>
        )}

        {showFinance && (
          <>
        <div
          className={'nav-link' + (isFinanceActive ? ' active' : '')}
          onClick={handleFinanceClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFinanceClick() } }}
          aria-expanded={financeMenuOpen}
          style={{ color: isFinanceActive ? '#fbbf24' : undefined }}
        >
          <Icon name="wallet" size={20} style={{ color: isFinanceActive ? '#fbbf24' : undefined }} />
          {!collapsed && <span>{t('nav.finance')}</span>}
        </div>
        {financeMenuOpen && (
          <div className="subnav" role="menu">
            <NavLink to="/finance" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="layout-dashboard" size={20} />
              {!collapsed && <span>{t('nav.financeDashboard')}</span>}
            </NavLink>
            <NavLink to="/finance/transactions" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="receipt" size={20} />
              {!collapsed && <span>{t('nav.financeTransactions')}</span>}
            </NavLink>
          </div>
        )}
          </>
        )}

        {showMedia && (
          <>
        <div
          className={'nav-link' + (isMediaActive ? ' active' : '')}
          onClick={handleMediaClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMediaClick() } }}
          aria-expanded={mediaMenuOpen}
          style={{ color: isMediaActive ? '#f472b6' : undefined }}
        >
          <Icon name="clapperboard" size={20} style={{ color: isMediaActive ? '#f472b6' : undefined }} />
          {!collapsed && <span>Media</span>}
        </div>
        {mediaMenuOpen && (
          <div className="subnav" role="menu">
            <NavLink to="/media" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="library" size={20} />
              {!collapsed && <span>Library</span>}
            </NavLink>
          </div>
        )}
          </>
        )}

        {showHabits && (
          <>
        <div
          className={'nav-link' + (isHabitsActive ? ' active' : '')}
          onClick={handleHabitsClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleHabitsClick() } }}
          aria-expanded={habitsMenuOpen}
          style={{ color: isHabitsActive ? '#a78bfa' : undefined }}
        >
          <Icon name="heart-pulse" size={20} style={{ color: isHabitsActive ? '#a78bfa' : undefined }} />
          {!collapsed && <span>{t('nav.habits')}</span>}
          {incompleteHabits > 0 && <span className="nav-badge">{incompleteHabits}</span>}
        </div>
        {habitsMenuOpen && (
          <div className="subnav" role="menu">
            <NavLink to="/habits" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="layout-dashboard" size={20} />
              {!collapsed && <span>{t('nav.habitsDashboard')}</span>}
            </NavLink>
          </div>
        )}
          </>
        )}
      </nav>

      <div className="sidebar-bottom">
        {!collapsed && <div className="sidebar-section-label">System</div>}
        <NavLink to="/settings" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <Icon name="settings" size={20} />
          {!collapsed && <span>{t('nav.settings')}</span>}
        </NavLink>
        <button className="nav-link" onClick={toggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
          {!collapsed && <span>{theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}</span>}
        </button>
        <button className="nav-link" onClick={logout}>
          <Icon name="log-out" size={20} />
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
      </div>
    </aside>
  )
}
