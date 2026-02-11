import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { refreshIfPossible, getTokens } from '../auth'

export default function AuthGuard({ children }) {
  const nav = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    (async () => {
      const { accessToken, refreshToken } = getTokens()
      if (accessToken && refreshToken) {
        const ok = await refreshIfPossible()
        if (ok) {
          setChecking(false)
        } else {
          nav('/login', { replace: true })
        }
      } else {
        const ok = await refreshIfPossible()
        if (ok) setChecking(false)
        else nav('/login', { replace: true })
      }
    })()
  }, [nav])

  if (checking) return (
    <div className="landing">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid var(--color-accent-muted)',
          borderTop: '3px solid var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ color: 'var(--color-text-secondary)' }}>Checking session...</span>
      </div>
    </div>
  )
  return children
}
