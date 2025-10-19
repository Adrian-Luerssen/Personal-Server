import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { refreshIfPossible } from '../auth'

export default function Landing({ dark, setDark }) {
  const nav = useNavigate()
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
        <p>Sign in to continue</p>
        <div className="actions">
          <Link className="btn" to="/login">Login</Link>
          <Link className="btn btn-ghost" to="/register">Register</Link>
        </div>
        <button className="btn small" onClick={() => setDark(d => !d)}>{dark ? 'Light' : 'Dark'} mode</button>
      </div>
    </div>
  )
}
