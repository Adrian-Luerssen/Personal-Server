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
        // try a refresh on each entry
        const ok = await refreshIfPossible()
        if (ok) {
          setChecking(false)
        } else {
          nav('/login', { replace: true })
        }
      } else {
        // no tokens, attempt refresh anyway (will fail)
        const ok = await refreshIfPossible()
        if (ok) setChecking(false)
        else nav('/login', { replace: true })
      }
    })()
  }, [nav])

  if (checking) return <div style={{padding:'2rem'}}>Checking session…</div>
  return children
}
