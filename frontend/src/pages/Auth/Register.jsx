import React, { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getApiBase } from '../../config'
import { isNativeMobileApp } from '../../mobilePlatform'
import BrandMark from '../../components/product/BrandMark'
import { PRODUCT } from '../../product/brand.mjs'

export default function Register() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const nativeApp = isNativeMobileApp()
  const formRef = useRef(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e) {
    e?.preventDefault?.()
    let apiBase = ''
    try {
      const form = formRef.current
      const formData = new FormData(form)
      const submittedName = String(formData.get('name') || '').trim()
      const submittedEmail = String(formData.get('email') || '').trim()
      const submittedPassword = String(formData.get('password') || '')

      setSubmitting(true)
      setMessage('')
      apiBase = getApiBase()
      const res = await fetch(apiBase + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: submittedName,
          email: submittedEmail,
          password: submittedPassword,
        })
      })
      if (!res.ok) {
        const txt = await res.text()
        let detail = txt
        try {
          const parsed = JSON.parse(txt)
          detail = parsed?.message || parsed?.error || txt
        } catch {
          // keep raw response
        }
        setMessage(`${t('common.error')}: ${detail}`)
        return
      }
      setMessage(t('auth.registeredSuccess'))
      nav('/login', { replace: true })
    } catch (e) {
      const reason = e?.message === 'Failed to fetch' && apiBase
        ? `Cannot reach the API at ${apiBase}. Check the Android API configuration and server availability.`
        : e.message
      setMessage(`${t('common.error')}: ${reason}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`auth-screen${nativeApp ? ' auth-screen--native' : ''}`}>
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="auth-brand__mark"><BrandMark size={32} /></div>
          <div>
            <div className="auth-brand__title">{PRODUCT.displayName}</div>
            <div className="auth-brand__subtitle">
              {PRODUCT.promise}
            </div>
          </div>
        </div>

        {nativeApp && (
          <div className="auth-mode-switch" aria-label="Authentication mode">
            <Link className="auth-mode-switch__item" to="/login">Login</Link>
            <Link className="auth-mode-switch__item active" to="/register" aria-current="page">Register</Link>
          </div>
        )}

        <div className="auth-copy">
          <h1>{t('auth.signUp')}</h1>
          <p>Choose managed hosting for the easiest setup, or connect this app to your own self-hosted service.</p>
        </div>

        <form ref={formRef} onSubmit={submit} className="auth-form" noValidate>
          <div className="field">
            <label>{t('auth.name')}</label>
            <input
              className="input auth-input"
              name="name"
              aria-label={t('auth.name')}
              value={name}
              autoComplete="name"
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>{t('auth.email')}</label>
            <input
              className="input auth-input"
              name="email"
              aria-label={t('auth.email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>{t('auth.password')}</label>
            <input
              className="input auth-input"
              name="password"
              aria-label={t('auth.password')}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="btn auth-submit"
            type="submit"
            disabled={submitting || !name.trim() || !email.trim() || !password}
          >
            {submitting ? t('common.loading') : t('auth.register')}
          </button>
        </form>
        <div className={`auth-switch${nativeApp ? ' auth-switch--web-secondary' : ''}`}>
          {t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link>
        </div>
        {message && <div className={message.startsWith(t('common.error')) ? 'alert-error' : 'alert-success'} style={{ marginTop: '1rem' }}>{message}</div>}
      </div>
    </div>
  )
}
