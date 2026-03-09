import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import { getTokens } from '../auth'

const PreferencesContext = createContext()

const DEFAULTS = {
  accentColor: '#7dd3fc',
  themeMode: 'dark',
  background: null,
  sidebarPosition: 'left',
  density: 'comfortable',
  customCss: null,
}

const LS_KEY = 'user-preferences'

function applyPreferences(prefs) {
  const root = document.documentElement

  // Theme
  const effectiveTheme = prefs.themeMode === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : prefs.themeMode
  root.dataset.theme = effectiveTheme

  // Density
  root.dataset.density = prefs.density

  // Sidebar position
  root.dataset.sidebarPosition = prefs.sidebarPosition

  // Accent color - inject CSS variable overrides
  const accentStyle = document.getElementById('user-accent-style') || (() => {
    const el = document.createElement('style')
    el.id = 'user-accent-style'
    document.head.appendChild(el)
    return el
  })()

  let css = `:root { --color-accent: ${prefs.accentColor}; --color-accent-hover: ${prefs.accentColor}dd; --color-accent-muted: ${prefs.accentColor}22; }`

  // Background
  if (prefs.background) {
    if (prefs.background.type === 'solid') {
      css += ` :root { --color-bg-base: ${prefs.background.value}; }`
    } else if (prefs.background.type === 'gradient') {
      css += ` body { background: ${prefs.background.value} !important; }`
    } else if (prefs.background.type === 'image') {
      css += ` body { background: url(${prefs.background.value}) center/cover fixed !important; }`
    }
  }

  // Custom CSS
  if (prefs.customCss) {
    css += `\n${prefs.customCss}`
  }

  accentStyle.textContent = css
}

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
    } catch { return DEFAULTS }
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
        const merged = { ...DEFAULTS, ...data }
        setPrefs(merged)
        localStorage.setItem(LS_KEY, JSON.stringify(merged))
      })
      .catch(() => {}) // silent fail, use local
  }, [])

  const updatePrefs = useCallback(async (updates) => {
    const next = { ...prefs, ...updates }
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
