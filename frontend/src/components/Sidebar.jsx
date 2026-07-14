import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { clearApiCache } from '../api'
import { usePreferences } from '../contexts/PreferencesContext'
import { isFeatureEnabled } from '../modulePreferences.mjs'
import { isNativeMobileApp } from '../mobilePlatform'
import { PRODUCT } from '../product/brand.mjs'
import BrandMark from './product/BrandMark'
import Icon from './icons/Icon'

const RECORD_LINKS = Object.freeze([
  { id: 'finance', label: 'Cash', to: '/finance/transactions', icon: 'wallet' },
  { id: 'training', label: 'Gym', to: '/workout', icon: 'dumbbell' },
  { id: 'habits', label: 'Habits', to: '/habits', icon: 'check-circle' },
  { id: 'music', label: 'Music', to: '/spotify', icon: 'music' },
  { id: 'media', label: 'Series', to: '/media', icon: 'clapperboard' },
])

function RailLink({ collapsed, icon, label, to, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `record-rail__link${isActive ? ' is-active' : ''}`}
      title={collapsed ? label : undefined}
    >
      <Icon name={icon} size={18} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )
}

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate()
  const { prefs } = usePreferences()
  const records = RECORD_LINKS.filter((item) => isFeatureEnabled(prefs, item.id))

  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    clearApiCache()
    navigate(isNativeMobileApp() ? '/login' : '/', { replace: true })
  }

  return (
    <aside className={`record-rail${collapsed ? ' is-collapsed' : ''}`} aria-label="Record rail">
      <div className="record-rail__brand-row">
        <NavLink to="/home" className="record-rail__brand" aria-label={`${PRODUCT.displayName} home`}>
          <BrandMark size={30} />
          {!collapsed && <span><strong>{PRODUCT.displayName}</strong><small>Private record system</small></span>}
        </NavLink>
        <button type="button" className="record-rail__collapse" onClick={onToggle} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
        </button>
      </div>

      <nav className="record-rail__nav" aria-label="Primary navigation">
        <RailLink collapsed={collapsed} to="/home" end icon="home" label="Today" />
        {!collapsed && <span className="record-rail__label">Records</span>}
        {records.map((item) => <RailLink key={item.id} collapsed={collapsed} {...item} />)}
        {!collapsed && <span className="record-rail__label">Workspace</span>}
        {isFeatureEnabled(prefs, 'assistant') && <RailLink collapsed={collapsed} to="/chat" icon="message-square" label="Assistant" />}
      </nav>

      <div className="record-rail__footer">
        {!collapsed && <span className="record-rail__label">System</span>}
        <RailLink collapsed={collapsed} to="/settings" icon="settings" label="Settings" />
        <button type="button" className="record-rail__link" onClick={logout} title={collapsed ? 'Sign out' : undefined}>
          <Icon name="log-out" size={18} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
