import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { refreshIfPossible, getTokens } from '../auth'
import BookplateLoader from './product/BookplateLoader'

export default function AuthGuard({ children }) {
  const nav = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    (async () => {
      const { accessToken, refreshToken } = getTokens()
      if (accessToken) {
        setChecking(false)
      } else if (refreshToken) {
        const ok = await refreshIfPossible()
        if (ok) setChecking(false)
        else nav('/login', { replace: true })
      } else {
        nav('/login', { replace: true })
      }
    })()
  }, [nav])

  if (checking) return <BookplateLoader screen label="Opening your record" />
  return children
}
