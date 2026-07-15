import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { Modal } from '../../components/shared'
import { Icon } from '../../components/icons'
import { signOut } from '../../session.js'

export default function Account() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const [accountInfo, setAccountInfo] = useState({ name: '', email: '' })
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountForm, setAccountForm] = useState({ name: '', email: '' })
  const [savingAccount, setSavingAccount] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaSetupData, setMfaSetupData] = useState(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaAction, setMfaAction] = useState(null)
  const [mfaLoading, setMfaLoading] = useState(false)

  async function loadAccountInfo() {
    try {
      const data = await api.get('/accounts')
      setAccountInfo(data)
      setAccountForm(data)
    } catch (e) {
      setError(e.message || t('errors.loadFailed'))
    }
  }

  async function loadMFAStatus() {
    try {
      const data = await api.get('/auth/mfa/status')
      setMfaEnabled(data.enabled)
    } catch (e) {
      console.error('Failed to load MFA status:', e)
    }
  }

  async function load() {
    setError('')
    setLoading(true)
    try {
      await Promise.all([loadAccountInfo(), loadMFAStatus()])
    } catch (e) {
      setError(e.message || t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function saveAccountInfo() {
    setSavingAccount(true)
    setError('')
    setInfo('')
    try {
      await api.post('/accounts', accountForm)
      setAccountInfo(accountForm)
      setEditingAccount(false)
      setInfo(t('common.success'))
    } catch (e) {
      setError(e.message || t('errors.generic'))
    } finally {
      setSavingAccount(false)
    }
  }

  function cancelEditAccount() {
    setAccountForm(accountInfo)
    setEditingAccount(false)
  }

  async function changePassword(e) {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(t('errors.validationError'))
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setError(t('errors.validationError'))
      return
    }
    setChangingPassword(true)
    setError('')
    setInfo('')
    try {
      await api.post('/accounts/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      })
      setInfo(t('common.success'))
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) {
      setError(e.message || t('errors.generic'))
    } finally {
      setChangingPassword(false)
    }
  }

  async function startMFASetup() {
    setMfaLoading(true)
    setError('')
    setInfo('')
    try {
      const data = await api.post('/auth/mfa/setup')
      setMfaSetupData(data)
      setMfaAction('setup')
    } catch (e) {
      setError(e.message || t('errors.generic'))
    } finally {
      setMfaLoading(false)
    }
  }

  async function enableMFA() {
    if (!mfaCode || mfaCode.length !== 6) {
      setError(t('errors.validationError'))
      return
    }
    setMfaLoading(true)
    setError('')
    setInfo('')
    try {
      const result = await api.post('/auth/mfa/enable', { secret: mfaSetupData.secret, code: mfaCode })
      if (result.success) {
        setInfo(t('common.success'))
        setMfaEnabled(true)
        setMfaAction(null)
        setMfaSetupData(null)
        setMfaCode('')
      } else {
        setError(result.message || t('errors.generic'))
      }
    } catch (e) {
      setError(e.message || t('errors.generic'))
    } finally {
      setMfaLoading(false)
    }
  }

  async function disableMFA() {
    if (!mfaCode || mfaCode.length !== 6) {
      setError(t('errors.validationError'))
      return
    }
    setMfaLoading(true)
    setError('')
    setInfo('')
    try {
      const result = await api.post('/auth/mfa/disable', { code: mfaCode })
      if (result.success) {
        setInfo(t('common.success'))
        setMfaEnabled(false)
        setMfaAction(null)
        setMfaCode('')
      } else {
        setError(result.message || t('errors.generic'))
      }
    } catch (e) {
      setError(e.message || t('errors.generic'))
    } finally {
      setMfaLoading(false)
    }
  }

  function cancelMFAAction() {
    setMfaAction(null)
    setMfaSetupData(null)
    setMfaCode('')
  }

  function logout() {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {info && <div className="alert-success" style={{ marginBottom: '1rem' }}>{info}</div>}

      {/* Personal Info */}
      <div className="card section" style={{ opacity: loading ? 0.7 : 1 }}>
        <h2>{t('profile.personalInfo')}</h2>
        {!editingAccount ? (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>{t('profile.username')}</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>{accountInfo.name || '\u2014'}</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>{t('profile.emailAddress')}</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>{accountInfo.email}</div>
            </div>
            <button className="btn small" onClick={() => setEditingAccount(true)}>{t('common.edit')}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '.75rem', maxWidth: 520 }}>
            <div className="field">
              <label>{t('profile.username')}</label>
              <input className="input" type="text" aria-label={t('profile.username')} value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} />
            </div>
            <div className="field">
              <label>{t('profile.emailAddress')}</label>
              <input className="input" type="email" aria-label={t('profile.emailAddress')} value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn small" onClick={saveAccountInfo} disabled={savingAccount}>{savingAccount ? t('common.loading') : t('common.save')}</button>
              <button className="btn small btn-ghost" onClick={cancelEditAccount} disabled={savingAccount}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card section settings-password-card">
        <h2>{t('profile.changePassword')}</h2>
        <p className="settings-password-help">
          Update your login password here. Use a unique password; changing it keeps existing sessions valid until they refresh.
        </p>
        <form onSubmit={changePassword} className="settings-password-form">
          <div className="field">
            <label>{t('profile.currentPassword')}</label>
            <input className="input" type="password" aria-label={t('profile.currentPassword')} value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} />
          </div>
          <div className="field">
            <label>{t('profile.newPassword')}</label>
            <input className="input" type="password" aria-label={t('profile.newPassword')} value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
          </div>
          <div className="field">
            <label>{t('profile.confirmNewPassword')}</label>
            <input className="input" type="password" aria-label={t('profile.confirmNewPassword')} value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
          </div>
          <button className="btn small" type="submit" disabled={changingPassword}>{changingPassword ? t('common.loading') : t('profile.updatePassword')}</button>
        </form>
      </div>

      {/* MFA */}
      <div className="card section">
        <h2>{t('profile.mfa')}</h2>
        {mfaAction === null ? (
          <div>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>{mfaEnabled ? t('profile.mfaEnabled') : t('profile.mfaDisabled')}</p>
            {!mfaEnabled ? (
              <button className="btn small" onClick={startMFASetup} disabled={mfaLoading}>{mfaLoading ? t('common.loading') : t('profile.enableMfa')}</button>
            ) : (
              <button className="btn small btn-danger" onClick={() => setMfaAction('disable')} disabled={mfaLoading}>{t('profile.disableMfa')}</button>
            )}
          </div>
        ) : mfaAction === 'setup' ? (
          <div>
            <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>Scan the QR code with your authenticator app:</p>
            <div style={{ marginBottom: '1rem', background: '#fff', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'inline-block' }}>
              <img src={mfaSetupData.qrCode} alt="MFA QR Code" style={{ display: 'block', width: 200, height: 200 }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Manual Entry Key:</div>
              <code style={{ display: 'block', maxWidth: 520, wordBreak: 'break-all' }}>{mfaSetupData.secret}</code>
            </div>
            <div style={{ maxWidth: 520 }}>
              <div className="field">
                <label>{t('auth.mfaCode')}</label>
                <input className="input" type="text" aria-label={t('auth.mfaCode')} value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder={t('auth.enterMfaCode')} maxLength={6} />
              </div>
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
                <button className="btn small" onClick={enableMFA} disabled={mfaLoading || mfaCode.length !== 6}>{mfaLoading ? t('common.loading') : t('auth.verifyCode')}</button>
                <button className="btn small btn-ghost" onClick={cancelMFAAction} disabled={mfaLoading}>{t('common.cancel')}</button>
              </div>
            </div>
          </div>
        ) : mfaAction === 'disable' ? (
          <div style={{ maxWidth: 520 }}>
            <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>{t('auth.enterMfaCode')}:</p>
            <div className="field">
              <label>{t('auth.mfaCode')}</label>
              <input className="input" type="text" aria-label={t('auth.mfaCode')} value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder={t('auth.enterMfaCode')} maxLength={6} />
            </div>
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
              <button className="btn small btn-danger" onClick={disableMFA} disabled={mfaLoading || mfaCode.length !== 6}>{mfaLoading ? t('common.loading') : t('profile.disableMfa')}</button>
              <button className="btn small btn-ghost" onClick={cancelMFAAction} disabled={mfaLoading}>{t('common.cancel')}</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card section account-session-card">
        <div className="account-session-card__copy">
          <span>Session</span>
          <h2>Sign out of Record</h2>
          <p>Remove this account session and its locally cached records from this device.</p>
        </div>
        <button type="button" className="btn btn-danger account-session-card__action" onClick={logout}>
          <Icon name="log-out" size={17} />
          Sign out
        </button>
      </div>
    </>
  )
}
