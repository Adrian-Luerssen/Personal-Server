import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getApiBase } from '../../config'

export default function Register() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function submit(e) {
    e.preventDefault()
    try {
      const res = await fetch(getApiBase() + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })
      if (!res.ok) {
        const txt = await res.text()
        setMessage(`${t('common.error')}: ${txt}`)
        return
      }
      const data = await res.json()
      setMessage(t('auth.registeredSuccess'))
      nav('/login', { replace: true })
    } catch (e) {
      setMessage(`${t('common.error')}: ${e.message}`)
    }
  }

  return (
    <div className="landing">
      <div className="card" style={{ minWidth: 360, maxWidth: 420, width: '100%' }}>
        <h2 style={{ marginBottom: '1rem' }}>{t('auth.signUp')}</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <div className="field">
            <label>{t('auth.name')}</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>{t('auth.email')}</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>{t('auth.password')}</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{ width: '100%' }}>{t('auth.register')}</button>
        </form>
        <div style={{ marginTop: '1rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>
          {t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link>
        </div>
        {message && <div className={message.startsWith(t('common.error')) ? 'alert-error' : 'alert-success'} style={{ marginTop: '1rem' }}>{message}</div>}
      </div>
    </div>
  )
}
