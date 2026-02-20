import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { refreshIfPossible } from '../auth'
import { useTheme } from '../contexts/ThemeContext'

export default function Landing() {
  const nav = useNavigate()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    (async () => {
      const ok = await refreshIfPossible()
      if (ok) nav('/home', { replace: true })
    })()
  }, [nav])

  return (
    <div className="landing">
      <div className="landing-hero">
        <h1>Welcome</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Sign in to continue</p>
        <div className="actions">
          <Link className="btn" to="/login">Login</Link>
          <Link className="btn btn-ghost" to="/register">Register</Link>
        </div>
        <button className="btn small btn-ghost" onClick={toggleTheme}>
          <span className="material-icons" style={{ fontSize: '18px' }}>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          {theme === 'dark' ? 'Light' : 'Dark'} mode
        </button>
      </div>
    </div>
  )
}
