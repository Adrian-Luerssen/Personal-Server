import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiBase } from '../config'

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
  setMessage('Registered: ' + (data.accountId || 'ok'))
  nav('/login', { replace: true })
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

  return (
    <div className="landing">
      <div className="card" style={{minWidth: 360}}>
        <h2>Create account</h2>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{width:'100%'}}>Register</button>
        </form>
        <div style={{marginTop:'.5rem', fontSize:'.9rem'}}>
          Already have an account? <a href="/login">Login</a>
        </div>
        {message && <pre style={{marginTop:'1rem'}}>{message}</pre>}
      </div>
    </div>
  )
}
