import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getApiBase } from '../../config'
import { refreshIfPossible } from '../../auth'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [tempToken, setTempToken] = useState('')

  useEffect(() => {
    (async () => {
      const ok = await refreshIfPossible()
      if (ok) nav('/home', { replace: true })
    })()
  }, [nav])

  async function submit(e) {
    e.preventDefault()
    try {
      const body = { email, password, rememberMe }
      if (mfaRequired && mfaCode) {
        body.mfaCode = mfaCode
      }
      const res = await fetch(getApiBase() + '/auth/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const txt = await res.text()
        setMessage('Error: ' + txt)
        return
      }
      const data = await res.json()
      if (data.mfaRequired) {
        setMfaRequired(true)
        setTempToken(data.tempToken)
        setMessage('Enter your MFA code')
        return
      }
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      setMessage('Logged in')
      nav('/home', { replace: true })
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

  return (
    <div className="landing">
      <div className="card" style={{ minWidth: 360, maxWidth: 420, width: '100%' }}>
        <h2 style={{ marginBottom: '1rem' }}>Sign in</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {!mfaRequired ? (
            <>
              <div className="field">
                <label>Email</label>
                <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                <label htmlFor="rememberMe" style={{ margin: 0, cursor: 'pointer' }}>Remember me</label>
              </div>
            </>
          ) : (
            <div className="field">
              <label>MFA Code</label>
              <input
                className="input"
                type="text"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength="6"
                autoComplete="off"
              />
            </div>
          )}
          <button className="btn" type="submit" style={{ width: '100%' }}>
            {mfaRequired ? 'Verify Code' : 'Login'}
          </button>
          {mfaRequired && (
            <button
              className="btn btn-ghost"
              type="button"
              style={{ width: '100%' }}
              onClick={() => { setMfaRequired(false); setMfaCode(''); setMessage('') }}
            >
              Back
            </button>
          )}
        </form>
        <div style={{ marginTop: '1rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>
          Don't have an account? <Link to="/register">Register</Link>
        </div>
        {message && <div className={message.startsWith('Error') ? 'alert-error' : 'alert-info'} style={{ marginTop: '1rem' }}>{message}</div>}
      </div>
    </div>
  )
}
