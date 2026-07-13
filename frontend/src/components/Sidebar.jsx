import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { clearApiCache } from '../api'
import { usePreferences, useTheme } from '../contexts/PreferencesContext'
import { isFeatureEnabled } from '../modulePreferences.mjs'
import { isNativeMobileApp } from '../mobilePlatform'
import { PRODUCT } from '../product/brand.mjs'
import BrandMark from './product/BrandMark'
import Icon from './icons/Icon'

const DOMAIN_LINKS = Object.freeze([
  { id: 'finance', label: 'Cash', to: '/finance/transactions', icon: 'wallet', tone: 'cash' },
  { id: 'habits', label: 'Habits', to: '/habits', icon: 'heart-pulse', tone: 'habits' },
  { id: 'training', label: 'Gym', to: '/workout', icon: 'dumbbell', tone: 'gym' },
  { id: 'music', label: 'Music', to: '/spotify', icon: 'music', tone: 'music' },
  { id: 'media', label: 'Series', to: '/media', icon: 'clapperboard', tone: 'series' },
  { id: 'assistant', label: 'Assistant', to: '/chat', icon: 'message-square', tone: 'assistant' },
])

function navClass({ isActive }) {
  return `nav-link${isActive ? ' active' : ''}`
}

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate()
  const { prefs } = usePreferences()
  const { theme, toggleTheme } = useTheme()
  const domains = DOMAIN_LINKS.filter((item) => isFeatureEnabled(prefs, item.id))

  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    clearApiCache()
    navigate(isNativeMobileApp() ? '/login' : '/', { replace: true })
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`} aria-label="Product navigation">
      <div className="sidebar-brand-shell">
        <NavLink to="/home" className="sidebar-brand" aria-label={`${PRODUCT.displayName} home`}>
          <span className="sidebar-brand-mark"><BrandMark size={31} /></span>
          {!collapsed && (
            <span className="sidebar-brand-copy">
              <strong>{PRODUCT.displayName}</strong>
              <small>{PRODUCT.promise}</small>
            </span>
          )}
        </NavLink>
        <button type="button" className="sidebar-toggle-btn" onClick={onToggle} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={18} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Records">
        {!collapsed && <span className="sidebar-section-label">Your record</span>}
        <NavLink to="/home" end className={navClass} style={{ '--nav-signal': 'var(--domain-today)' }}>
          <Icon name="home" size={19} />
          {!collapsed && <span>Today</span>}
        </NavLink>
        {!collapsed && <span className="sidebar-section-label">Instruments</span>}
        {domains.map((item) => (
          <NavLink key={item.id} to={item.to} className={navClass} style={{ '--nav-signal': `var(--domain-${item.tone})` }}>
            <Icon name={item.icon} size={19} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {!collapsed && <span className="sidebar-section-label">System</span>}
        <NavLink to="/settings" className={navClass} style={{ '--nav-signal': 'var(--domain-assistant)' }}>
          <Icon name="settings" size={19} />
          {!collapsed && <span>You</span>}
        </NavLink>
        <button type="button" className="nav-link" onClick={toggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
          {!collapsed && <span>{theme === 'dark' ? 'Light appearance' : 'Dark appearance'}</span>}
        </button>
        <button type="button" className="nav-link" onClick={logout}>
          <Icon name="log-out" size={19} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
