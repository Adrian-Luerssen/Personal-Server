import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'

export default function Sidebar({ collapsed, onToggle }) {
  const nav = useNavigate()
  const location = useLocation()
  const [spotifyLinked, setSpotifyLinked] = useState(null) // null = unknown, true/false once loaded
  const [spotifyMenuOpen, setSpotifyMenuOpen] = useState(false)
  const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false)
  useEffect(() => {
    let ignore = false
    api.get('/spotify/linked')
      .then(r => { if (!ignore) setSpotifyLinked(!!r?.linked) })
      .catch(() => { if (!ignore) setSpotifyLinked(false) })
    return () => { ignore = true }
  }, [location.pathname])

  // Open submenu when navigating to a spotify route and account is linked
  useEffect(() => {
    const onSpotifyRoute = location.pathname.startsWith('/spotify')
    if (spotifyLinked && onSpotifyRoute) setSpotifyMenuOpen(true)
    if (!onSpotifyRoute) setSpotifyMenuOpen(false)
  }, [location.pathname, spotifyLinked])

  // Open workout submenu when navigating to a workout route
  useEffect(() => {
    const onWorkoutRoute = location.pathname.startsWith('/workout')
    if (onWorkoutRoute) setWorkoutMenuOpen(true)
    else setWorkoutMenuOpen(false)
  }, [location.pathname])

  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    nav('/', { replace: true })
  }

  const isSpotifyActive = location.pathname.startsWith('/spotify')
  const isWorkoutActive = location.pathname.startsWith('/workout')
  const handleSpotifyClick = () => {
    if (spotifyLinked) {
      setSpotifyMenuOpen(o => !o)
    } else {
      // Default to global when not linked (or unknown)
      nav('/spotify/global')
    }
  }
  const handleSpotifyKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSpotifyClick()
    }
  }
  const handleWorkoutClick = () => {
    setWorkoutMenuOpen(o => !o)
  }
  const handleWorkoutKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleWorkoutClick()
    }
  }
  return (
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
      <div className="brand">Personal Server</div>
      <button className="btn btn-ghost small" onClick={onToggle}>
        <span className="material-icons" style={{ fontSize: '20px' }}>{collapsed ? 'chevron_right' : 'chevron_left'}</span>
      </button>
      <nav className="nav">
        <NavLink to="/home" className={({isActive})=> 'nav-link'+(isActive?' active':'')}>
          <span className="material-icons" style={{ fontSize: '20px', marginRight: collapsed ? 0 : '8px' }}>home</span>
          {!collapsed && 'Home'}
        </NavLink>
        <NavLink to="/profile" className={({isActive})=> 'nav-link'+(isActive?' active':'')}>
          <span className="material-icons" style={{ fontSize: '20px', marginRight: collapsed ? 0 : '8px' }}>person</span>
          {!collapsed && 'Profile'}
        </NavLink>
        
        {/* Spotify section with conditional dropdown */}
        <div
          className={'nav-link' + (isSpotifyActive ? ' active' : '')}
          onClick={handleSpotifyClick}
          onKeyDown={handleSpotifyKey}
          role="button"
          tabIndex={0}
          aria-expanded={spotifyLinked ? spotifyMenuOpen : undefined}
          aria-haspopup={spotifyLinked ? 'menu' : undefined}
        >
          {collapsed ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>music_note</span>
              {spotifyLinked === false && <span className="material-icons" style={{ fontSize: '16px', color: '#fbbf24' }}>warning</span>}
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>music_note</span>
              <span>Spotify {spotifyLinked ? (spotifyMenuOpen ? '▾' : '▸') : '(global)'}</span>
            </span>
          )}
        </div>
        {spotifyLinked && spotifyMenuOpen && (
          <div className="subnav" role="menu" aria-label="Spotify views" style={{ marginLeft: collapsed ? 12 : 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <NavLink to="/spotify/personal" className={({isActive})=> 'nav-link'+(isActive?' active':'')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: collapsed ? 0 : '8px' }}>person</span>
              {!collapsed && 'Personal'}
            </NavLink>
            <NavLink to="/spotify/global" className={({isActive})=> 'nav-link'+(isActive?' active':'')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: collapsed ? 0 : '8px' }}>public</span>
              {!collapsed && 'Global'}
            </NavLink>
          </div>
        )}
        
        {/* Workout section with dropdown */}
        <div
          className={'nav-link' + (isWorkoutActive ? ' active' : '')}
          onClick={handleWorkoutClick}
          onKeyDown={handleWorkoutKey}
          role="button"
          tabIndex={0}
          aria-expanded={workoutMenuOpen}
          aria-haspopup="menu"
        >
          {collapsed ? (
            <span className="material-icons" style={{ fontSize: '20px' }}>fitness_center</span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>fitness_center</span>
              <span>Workout {workoutMenuOpen ? '▾' : '▸'}</span>
            </span>
          )}
        </div>
        {workoutMenuOpen && (
          <div className="subnav" role="menu" aria-label="Workout views" style={{ marginLeft: collapsed ? 12 : 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <NavLink to="/workout" className={({isActive})=> 'nav-link'+(isActive?' active':'')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: collapsed ? 0 : '8px' }}>dashboard</span>
              {!collapsed && 'Dashboard'}
            </NavLink>
            <NavLink to="/workout/active" className={({isActive})=> 'nav-link'+(isActive?' active':'')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: collapsed ? 0 : '8px' }}>bolt</span>
              {!collapsed && 'Active'}
            </NavLink>
            <NavLink to="/workout/history" className={({isActive})=> 'nav-link'+(isActive?' active':'')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: collapsed ? 0 : '8px' }}>history</span>
              {!collapsed && 'History'}
            </NavLink>
            <NavLink to="/workout/exercises" className={({isActive})=> 'nav-link'+(isActive?' active':'')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: collapsed ? 0 : '8px' }}>list</span>
              {!collapsed && 'Exercises'}
            </NavLink>
            <NavLink to="/workout/bodyweight" className={({isActive})=> 'nav-link'+(isActive?' active':'')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: collapsed ? 0 : '8px' }}>monitor_weight</span>
              {!collapsed && 'Bodyweight'}
            </NavLink>
            <NavLink to="/workout/import" className={({isActive})=> 'nav-link'+(isActive?' active':'')} role="menuitem">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: collapsed ? 0 : '8px' }}>file_download</span>
              {!collapsed && 'Import'}
            </NavLink>
          </div>
        )}
      </nav>
      <button className="btn btn-ghost" onClick={logout}>Logout</button>
    </aside>
  )
}
