import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiBase } from '../../config'
import { refreshIfPossible } from '../../auth'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    (async () => {
      const ok = await refreshIfPossible()
      if (ok) nav('/home', { replace: true })
    })()
  }, [nav])

  async function submit(e) {
    e.preventDefault()
    try {
  const res = await fetch(getApiBase() + '/auth/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe: true })
      })
      if (!res.ok) {
        const txt = await res.text()
        setMessage('Error: ' + txt)
        return
      }
      const data = await res.json()
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
      <div className="card" style={{minWidth: 360}}>
        <h2>Sign in</h2>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{width:'100%'}}>Login</button>
        </form>
        <div style={{marginTop:'.5rem', fontSize:'.9rem'}}>
          Don't have an account? <a href="/register">Register</a>
        </div>
        {message && <pre style={{marginTop:'1rem'}}>{message}</pre>}
      </div>
    </div>
  )
}
