import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import { getTokens } from '../auth'
import {
  DEFAULT_FEATURE_MODULES,
  DEFAULT_HOME_LAYOUT,
  DEFAULT_WIDGET_LAYOUT,
  getFeatureModulePreferences,
} from '../modulePreferences.mjs'

const PreferencesContext = createContext()

const DEFAULTS = {
  accentColor: '#7c5cff',
  themeMode: 'dark',
  background: null,
  sidebarPosition: 'left',
  density: 'comfortable',
  customCss: null,
  featureModules: DEFAULT_FEATURE_MODULES,
  homeLayout: DEFAULT_HOME_LAYOUT,
  widgetLayout: DEFAULT_WIDGET_LAYOUT,
}

const LS_KEY = 'user-preferences'

function normalizePreferences(input = {}) {
  const merged = { ...DEFAULTS, ...(input || {}) }
  return {
    ...merged,
    ...getFeatureModulePreferences(merged),
    accentColor: '#7c5cff',
    themeMode: 'dark',
    background: null,
    sidebarPosition: 'left',
    customCss: null,
  }
}

function applyPreferences(prefs) {
  const root = document.documentElement

  root.dataset.theme = 'dark'

  // Density
  root.dataset.density = prefs.density

  // Sidebar position
  root.dataset.sidebarPosition = 'left'
  document.getElementById('user-accent-style')?.remove()
}

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      return stored ? normalizePreferences(JSON.parse(stored)) : normalizePreferences(DEFAULTS)
    } catch { return normalizePreferences(DEFAULTS) }
  })

  // Apply on mount and whenever prefs change
  useEffect(() => {
    applyPreferences(prefs)
  }, [prefs])

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (prefs.themeMode !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyPreferences(prefs)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [prefs.themeMode])

  // Fetch from API on mount if logged in
  useEffect(() => {
    const { accessToken } = getTokens()
    if (!accessToken) return
    apiFetch('/accounts/preferences')
      .then(data => {
        const merged = normalizePreferences(data)
        setPrefs(merged)
        localStorage.setItem(LS_KEY, JSON.stringify(merged))
      })
      .catch(() => {}) // silent fail, use local
  }, [])

  const updatePrefs = useCallback(async (updates) => {
    const next = normalizePreferences({ ...prefs, ...updates })
    setPrefs(next)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    try {
      await apiFetch('/accounts/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    } catch {} // silent fail, local already updated
  }, [prefs])

  const toggleTheme = useCallback(() => {
    const next = prefs.themeMode === 'dark' ? 'light' : 'dark'
    updatePrefs({ themeMode: next })
  }, [prefs.themeMode, updatePrefs])

  return (
    <PreferencesContext.Provider value={{ prefs, updatePrefs, toggleTheme, theme: prefs.themeMode === 'auto'
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : prefs.themeMode }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  return useContext(PreferencesContext)
}

// Backwards compatibility
export function useTheme() {
  const { prefs, toggleTheme } = usePreferences()
  return {
    theme: prefs.themeMode === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : prefs.themeMode,
    toggleTheme
  }
}
