import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getApiBase } from '../../config'
import { refreshIfPossible, setTokens } from '../../auth'
import { isNativeMobileApp } from '../../mobilePlatform'
import BrandMark from '../../components/product/BrandMark'
import { PRODUCT } from '../../product/brand.mjs'
import Icon from '../../components/icons/Icon'

export default function Login() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const nativeApp = isNativeMobileApp()
  const formRef = useRef(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [rememberMe, setRememberMe] = useState(() => isNativeMobileApp())
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    (async () => {
      const ok = await refreshIfPossible()
      if (ok) nav('/home', { replace: true })
    })()
  }, [nav])

  async function submit(e) {
    e?.preventDefault?.()
    let apiBase = ''
    try {
      const form = formRef.current
      const formData = new FormData(form)
      const submittedEmail = String(formData.get('email') || '').trim()
      const submittedPassword = String(formData.get('password') || '')
      const submittedMfaCode = String(formData.get('mfaCode') || '').trim()

      setSubmitting(true)
      setMessage('')
      apiBase = getApiBase()
      const body = {
        email: submittedEmail,
        password: submittedPassword,
        rememberMe,
      }
      if (mfaRequired && submittedMfaCode) {
        body.mfaCode = submittedMfaCode
      }
      const res = await fetch(apiBase + '/auth/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
      const data = await res.json()
      if (data.mfaRequired) {
        setMfaRequired(true)
        setMessage(t('auth.enterMfaCode'))
        return
      }
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      setMessage(t('auth.loggedIn'))
      nav('/home', { replace: true })
    } catch (e) {
      const reason = e?.message === 'Failed to fetch' && apiBase
        ? `Cannot reach the API at ${apiBase}. Check the Android API configuration and server availability.`
        : e.message
      setMessage(`${t('common.error')}: ${reason}`)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = mfaRequired
    ? mfaCode.trim().length > 0
    : email.trim().length > 0 && password.length > 0

  return (
    <div className={`auth-screen${nativeApp ? ' auth-screen--native' : ''}`}>
      <aside className="auth-record-context" aria-label="Record product context">
        <Link to="/" className="auth-back-link"><Icon name="arrow-left" size={14} /> Back to Record</Link>
        <div>
          <span className="auth-record-context__eyebrow">PRIVATE RECORD SYSTEM</span>
          <h2>Your history stays useful when you can return to it.</h2>
          <p>Sign in to continue the same record across web and Android.</p>
        </div>
        <div className="auth-record-context__register" aria-label="Available records">
          <span><Icon name="wallet" size={15} /><strong>Cash</strong><small>Transactions and capture</small></span>
          <span><Icon name="dumbbell" size={15} /><strong>Gym</strong><small>Sessions and sets</small></span>
          <span><Icon name="clapperboard" size={15} /><strong>Series</strong><small>Seasons and releases</small></span>
        </div>
      </aside>
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
            <Link className="auth-mode-switch__item active" to="/login" aria-current="page">Login</Link>
            <Link className="auth-mode-switch__item" to="/register">Register</Link>
          </div>
        )}

        <div className="auth-copy">
          <h1>{mfaRequired ? t('auth.verifyCode') : t('auth.signIn')}</h1>
          <p>{mfaRequired ? t('auth.enterMfaCode') : 'Open your latest records, then verify what changed.'}</p>
        </div>

        <form ref={formRef} onSubmit={submit} className="auth-form" noValidate>
          {!mfaRequired ? (
            <>
              <div className="field">
                <label>{t('auth.email')}</label>
                <input
                  className="input auth-input"
                  name="email"
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
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="auth-check-row">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMe">{t('auth.rememberMe')}</label>
              </div>
            </>
          ) : (
            <div className="field">
              <label>{t('auth.mfaCode')}</label>
              <input
                className="input auth-input"
                name="mfaCode"
                type="text"
                inputMode="numeric"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('auth.enterMfaCode')}
                maxLength={6}
                autoComplete="one-time-code"
              />
            </div>
          )}
          <button
            className="btn auth-submit"
            type="submit"
            disabled={!canSubmit || submitting}
          >
            {submitting ? t('common.loading') : (mfaRequired ? t('auth.verifyCode') : t('auth.login'))}
          </button>
          {mfaRequired && (
            <button
              className="btn btn-ghost"
              type="button"
              disabled={submitting}
              onClick={() => { setMfaRequired(false); setMfaCode(''); setMessage('') }}
            >
              {t('common.back')}
            </button>
          )}
        </form>
        <div className={`auth-switch${nativeApp ? ' auth-switch--web-secondary' : ''}`}>
          {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
        </div>
        {message && <div className={`auth-message ${message.startsWith(t('common.error')) ? 'alert-error' : 'alert-info'}`} role="status">{message}</div>}
      </div>
    </div>
  )
}
