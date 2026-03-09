import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { useTheme } from '../contexts/PreferencesContext'
import Icon from './icons/Icon'

export default function Sidebar({ collapsed, onToggle }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [spotifyLinked, setSpotifyLinked] = useState(null)
  const [spotifyMenuOpen, setSpotifyMenuOpen] = useState(false)
  const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false)
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false)
  const [habitsMenuOpen, setHabitsMenuOpen] = useState(false)

  useEffect(() => {
    let ignore = false
    api.get('/spotify/linked')
      .then(r => { if (!ignore) setSpotifyLinked(!!r?.linked) })
      .catch(() => { if (!ignore) setSpotifyLinked(false) })
    return () => { ignore = true }
  }, [location.pathname])

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
    const onHabitsRoute = location.pathname.startsWith('/habits')
    if (onHabitsRoute) setHabitsMenuOpen(true)
    else setHabitsMenuOpen(false)
  }, [location.pathname])

  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    nav('/', { replace: true })
  }

  const isSpotifyActive = location.pathname.startsWith('/spotify')
  const isWorkoutActive = location.pathname.startsWith('/workout')
  const isFinanceActive = location.pathname.startsWith('/finance')
  const isHabitsActive = location.pathname.startsWith('/habits')

  const handleSpotifyClick = () => {
    if (spotifyLinked) {
      setSpotifyMenuOpen(o => !o)
    } else {
      nav('/spotify/global')
    }
  }

  const handleWorkoutClick = () => {
    setWorkoutMenuOpen(o => !o)
  }

  const handleFinanceClick = () => {
    setFinanceMenuOpen(o => !o)
  }

  const handleHabitsClick = () => {
    setHabitsMenuOpen(o => !o)
  }

  return (
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
      <div className="brand">{collapsed ? 'PS' : t('common.appName')}</div>
      <button className="btn btn-ghost small" onClick={onToggle} style={{ alignSelf: 'flex-start', marginBottom: '0.5rem' }}>
        <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={20} />
      </button>
      <nav className="nav">
        <NavLink to="/home" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <Icon name="home" size={20} />
          {!collapsed && <span>{t('nav.home')}</span>}
        </NavLink>
        <NavLink to="/profile" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <Icon name="user" size={20} />
          {!collapsed && <span>{t('nav.profile')}</span>}
        </NavLink>

        <div
          className={'nav-link' + (isSpotifyActive ? ' active' : '')}
          onClick={handleSpotifyClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSpotifyClick() } }}
          aria-expanded={spotifyLinked ? spotifyMenuOpen : undefined}
        >
          <Icon name="music" size={20} />
          {!collapsed && <span>{t('nav.spotify')} {spotifyLinked ? (spotifyMenuOpen ? '▾' : '▸') : ''}</span>}
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
          </div>
        )}

        <div
          className={'nav-link' + (isWorkoutActive ? ' active' : '')}
          onClick={handleWorkoutClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWorkoutClick() } }}
          aria-expanded={workoutMenuOpen}
        >
          <Icon name="dumbbell" size={20} />
          {!collapsed && <span>{t('nav.workout')} {workoutMenuOpen ? '▾' : '▸'}</span>}
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
            <NavLink to="/workout/import" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="download" size={20} />
              {!collapsed && <span>{t('nav.workoutImport')}</span>}
            </NavLink>
          </div>
        )}

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
          {!collapsed && <span>{t('nav.finance')} {financeMenuOpen ? '▾' : '▸'}</span>}
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
            <NavLink to="/finance/wallets" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="landmark" size={20} />
              {!collapsed && <span>{t('nav.financeWallets')}</span>}
            </NavLink>
            <NavLink to="/finance/import" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="download" size={20} />
              {!collapsed && <span>{t('nav.financeImport')}</span>}
            </NavLink>
          </div>
        )}

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
          {!collapsed && <span>{t('nav.habits')} {habitsMenuOpen ? '▾' : '▸'}</span>}
        </div>
        {habitsMenuOpen && (
          <div className="subnav" role="menu">
            <NavLink to="/habits" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="layout-dashboard" size={20} />
              {!collapsed && <span>{t('nav.habitsDashboard')}</span>}
            </NavLink>
            <NavLink to="/habits/import" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <Icon name="download" size={20} />
              {!collapsed && <span>{t('nav.habitsImport')}</span>}
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-bottom">
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
