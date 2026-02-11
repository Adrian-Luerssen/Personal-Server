import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getApiBase } from '../../config'

export default function Register() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function submit(e) {
    e.preventDefault()
    try {
      const res = await fetch(getApiBase() + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) {
        const txt = await res.text()
        setMessage('Error: ' + txt)
        return
      }
      const data = await res.json()
      setMessage('Registered successfully')
      nav('/login', { replace: true })
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

  return (
    <div className="landing">
      <div className="card" style={{ minWidth: 360, maxWidth: 420, width: '100%' }}>
        <h2 style={{ marginBottom: '1rem' }}>Create account</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <div className="field">
            <label>Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{ width: '100%' }}>Register</button>
        </form>
        <div style={{ marginTop: '1rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
        {message && <div className={message.startsWith('Error') ? 'alert-error' : 'alert-success'} style={{ marginTop: '1rem' }}>{message}</div>}
      </div>
    </div>
  )
}
