import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { useTheme } from '../contexts/ThemeContext'

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
        <span className="material-icons" style={{ fontSize: '20px' }}>{collapsed ? 'chevron_right' : 'chevron_left'}</span>
      </button>
      <nav className="nav">
        <NavLink to="/home" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <span className="material-icons" style={{ fontSize: '20px' }}>home</span>
          {!collapsed && <span>{t('nav.home')}</span>}
        </NavLink>
        <NavLink to="/profile" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <span className="material-icons" style={{ fontSize: '20px' }}>person</span>
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
          <span className="material-icons" style={{ fontSize: '20px' }}>music_note</span>
          {!collapsed && <span>{t('nav.spotify')} {spotifyLinked ? (spotifyMenuOpen ? '▾' : '▸') : ''}</span>}
          {collapsed && spotifyLinked === false && <span className="material-icons" style={{ fontSize: '14px', color: 'var(--color-warning)' }}>warning</span>}
        </div>
        {spotifyLinked && spotifyMenuOpen && (
          <div className="subnav" role="menu">
            <NavLink to="/spotify/personal" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>person</span>
              {!collapsed && <span>{t('nav.spotifyPersonal')}</span>}
            </NavLink>
            <NavLink to="/spotify/global" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>public</span>
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
          <span className="material-icons" style={{ fontSize: '20px' }}>fitness_center</span>
          {!collapsed && <span>{t('nav.workout')} {workoutMenuOpen ? '▾' : '▸'}</span>}
        </div>
        {workoutMenuOpen && (
          <div className="subnav" role="menu">
            <NavLink to="/workout" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>dashboard</span>
              {!collapsed && <span>{t('nav.workoutDashboard')}</span>}
            </NavLink>
            <NavLink to="/workout/active" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>bolt</span>
              {!collapsed && <span>{t('nav.workoutActive')}</span>}
            </NavLink>
            <NavLink to="/workout/history" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>history</span>
              {!collapsed && <span>{t('nav.workoutHistory')}</span>}
            </NavLink>
            <NavLink to="/workout/exercises" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>list</span>
              {!collapsed && <span>{t('nav.workoutExercises')}</span>}
            </NavLink>
            <NavLink to="/workout/bodyweight" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>monitor_weight</span>
              {!collapsed && <span>{t('nav.workoutBodyweight')}</span>}
            </NavLink>
            <NavLink to="/workout/import" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>file_download</span>
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
          <span className="material-icons" style={{ fontSize: '20px', color: isFinanceActive ? '#fbbf24' : undefined }}>account_balance_wallet</span>
          {!collapsed && <span>{t('nav.finance')} {financeMenuOpen ? '▾' : '▸'}</span>}
        </div>
        {financeMenuOpen && (
          <div className="subnav" role="menu">
            <NavLink to="/finance" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>dashboard</span>
              {!collapsed && <span>{t('nav.financeDashboard')}</span>}
            </NavLink>
            <NavLink to="/finance/transactions" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>receipt_long</span>
              {!collapsed && <span>{t('nav.financeTransactions')}</span>}
            </NavLink>
            <NavLink to="/finance/wallets" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>account_balance</span>
              {!collapsed && <span>{t('nav.financeWallets')}</span>}
            </NavLink>
            <NavLink to="/finance/import" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>file_download</span>
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
          <span className="material-icons" style={{ fontSize: '20px', color: isHabitsActive ? '#a78bfa' : undefined }}>self_improvement</span>
          {!collapsed && <span>{t('nav.habits')} {habitsMenuOpen ? '▾' : '▸'}</span>}
        </div>
        {habitsMenuOpen && (
          <div className="subnav" role="menu">
            <NavLink to="/habits" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>dashboard</span>
              {!collapsed && <span>{t('nav.habitsDashboard')}</span>}
            </NavLink>
            <NavLink to="/habits/import" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px' }}>file_download</span>
              {!collapsed && <span>{t('nav.habitsImport')}</span>}
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-bottom">
        <NavLink to="/settings" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <span className="material-icons" style={{ fontSize: '20px' }}>settings</span>
          {!collapsed && <span>{t('nav.settings')}</span>}
        </NavLink>
        <button className="nav-link" onClick={toggleTheme}>
          <span className="material-icons" style={{ fontSize: '20px' }}>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          {!collapsed && <span>{theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}</span>}
        </button>
        <button className="nav-link" onClick={logout}>
          <span className="material-icons" style={{ fontSize: '20px' }}>logout</span>
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
      </div>
    </aside>
  )
}
