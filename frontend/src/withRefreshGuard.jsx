import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { refreshIfPossible } from './auth'

export default function withRefreshGuard(Component) {
  return function Guarded(props) {
    const nav = useNavigate()
    useEffect(() => {
      let mounted = true
      refreshIfPossible().then((ok) => {
        if (!ok && mounted) nav('/login', { replace: true })
      })
      return () => { mounted = false }
    }, [])
    return <Component {...props} />
  }
}
