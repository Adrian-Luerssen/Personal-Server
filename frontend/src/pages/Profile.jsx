import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { useOutletContext } from 'react-router-dom'

export default function Profile() {
  const { sidebarCollapsed } = useOutletContext() || {}
  
  // General states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  
  // Account info
  const [accountInfo, setAccountInfo] = useState({ name: '', email: '' })
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountForm, setAccountForm] = useState({ name: '', email: '' })
  const [savingAccount, setSavingAccount] = useState(false)
  
  // Password change
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  
  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaSetupData, setMfaSetupData] = useState(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaAction, setMfaAction] = useState(null) // 'setup', 'enable', 'disable'
  const [mfaLoading, setMfaLoading] = useState(false)
  
  // Spotify
  const [linked, setLinked] = useState(false)
  const [me, setMe] = useState(null)
  const [showBackfillConfirm, setShowBackfillConfirm] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [spotifyForm, setSpotifyForm] = useState({
    accessToken: '',
    refreshToken: '',
    tokenType: 'Bearer',
    scope: '',
    expiresIn: 3600,
  })

  async function loadAccountInfo() {
    try {
      const data = await api.get('/accounts')
      setAccountInfo(data)
      setAccountForm(data)
    } catch (e) {
      setError(e.message || 'Failed to load account info')
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

  async function loadSpotify() {
    try {
      const link = await api.get('/spotify/linked')
      setLinked(!!link?.linked)
      if (link?.linked) {
        const meData = await api.get('/spotify/me')
        setMe(meData)
      } else {
        setMe(null)
      }
    } catch (e) {
      console.error('Failed to load Spotify:', e)
    }
  }

  async function load() {
    setError('')
    setLoading(true)
    try {
      await Promise.all([loadAccountInfo(), loadMFAStatus(), loadSpotify()])
    } catch (e) {
      setError(e.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Account info handlers
  async function saveAccountInfo() {
    setSavingAccount(true)
    setError('')
    setInfo('')
    try {
      await api.post('/accounts', accountForm)
      setAccountInfo(accountForm)
      setEditingAccount(false)
      setInfo('Account information updated successfully')
    } catch (e) {
      setError(e.message || 'Failed to update account')
    } finally {
      setSavingAccount(false)
    }
  }

  function cancelEditAccount() {
    setAccountForm(accountInfo)
    setEditingAccount(false)
  }

  // Password change handlers
  async function changePassword(e) {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    setChangingPassword(true)
    setError('')
    setInfo('')
    try {
      await api.post('/account/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      })
      setInfo('Password changed successfully')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) {
      setError(e.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  // MFA handlers
  async function startMFASetup() {
    setMfaLoading(true)
    setError('')
    setInfo('')
    try {
      const data = await api.post('/auth/mfa/setup')
      setMfaSetupData(data)
      setMfaAction('setup')
    } catch (e) {
      setError(e.message || 'Failed to setup MFA')
    } finally {
      setMfaLoading(false)
    }
  }

  async function enableMFA() {
    if (!mfaCode || mfaCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }
    setMfaLoading(true)
    setError('')
    setInfo('')
    try {
      const result = await api.post('/auth/mfa/enable', {
        secret: mfaSetupData.secret,
        code: mfaCode,
      })
      if (result.success) {
        setInfo('MFA enabled successfully')
        setMfaEnabled(true)
        setMfaAction(null)
        setMfaSetupData(null)
        setMfaCode('')
      } else {
        setError(result.message || 'Failed to enable MFA')
      }
    } catch (e) {
      setError(e.message || 'Failed to enable MFA')
    } finally {
      setMfaLoading(false)
    }
  }

  async function disableMFA() {
    if (!mfaCode || mfaCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }
    setMfaLoading(true)
    setError('')
    setInfo('')
    try {
      const result = await api.post('/auth/mfa/disable', { code: mfaCode })
      if (result.success) {
        setInfo('MFA disabled successfully')
        setMfaEnabled(false)
        setMfaAction(null)
        setMfaCode('')
      } else {
        setError(result.message || 'Failed to disable MFA')
      }
    } catch (e) {
      setError(e.message || 'Failed to disable MFA')
    } finally {
      setMfaLoading(false)
    }
  }

  function cancelMFAAction() {
    setMfaAction(null)
    setMfaSetupData(null)
    setMfaCode('')
  }

  // Spotify handlers
  async function startBackfill() {
    setBackfilling(true)
    setError('')
    setInfo('')
    try {
      await api.post('/spotify/backfill-streams')
      setInfo('Backfill started. This may take a while as Spotify is queried repeatedly until no more recent streams are found. Completeness is not guaranteed.')
      setShowBackfillConfirm(false)
    } catch (e) {
      setError(e.message || 'Failed to start backfill')
    } finally {
      setBackfilling(false)
    }
  }

  async function onSubmitSpotify(e) {
    e.preventDefault()
    setError('')
    try {
      if (!spotifyForm.accessToken) throw new Error('Access token is required')
      await api.post('/spotify/tokens', {
        accessToken: spotifyForm.accessToken,
        refreshToken: spotifyForm.refreshToken || undefined,
        tokenType: spotifyForm.tokenType || undefined,
        scope: spotifyForm.scope || undefined,
        expiresIn: spotifyForm.expiresIn ? Number(spotifyForm.expiresIn) : undefined,
      })
      await loadSpotify()
    } catch (e) {
      setError(e.message || 'Failed to link Spotify')
    }
  }

  return (
    <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
      <h1>Profile</h1>
      {error && <div className="card" style={{ borderColor: 'rgba(255,0,0,0.2)' }}>{error}</div>}
      {info && <div className="card" style={{ borderColor: 'rgba(125,211,252,0.3)' }}>{info}</div>}

      {/* Account Information */}
      <div className="card" style={{ opacity: loading ? 0.7 : 1 }}>
        <h2>Account Information</h2>
        {!editingAccount ? (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Name</div>
              <div style={{ opacity: 0.9 }}>{accountInfo.name || 'Not set'}</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Email</div>
              <div style={{ opacity: 0.9 }}>{accountInfo.email}</div>
            </div>
            <button className="btn small" onClick={() => setEditingAccount(true)}>Edit</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '.5rem', maxWidth: 520 }}>
            <label>
              <div>Name</div>
              <input
                type="text"
                value={accountForm.name}
                onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                placeholder="Your name"
              />
            </label>
            <label>
              <div>Email</div>
              <input
                type="email"
                value={accountForm.email}
                onChange={e => setAccountForm({ ...accountForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </label>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn small" onClick={saveAccountInfo} disabled={savingAccount}>
                {savingAccount ? 'Saving...' : 'Save'}
              </button>
              <button className="btn small" onClick={cancelEditAccount} disabled={savingAccount}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card">
        <h2>Change Password</h2>
        <form onSubmit={changePassword} style={{ display: 'grid', gap: '.5rem', maxWidth: 520 }}>
          <label>
            <div>Current Password</div>
            <input
              type="password"
              value={passwordForm.oldPassword}
              onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              placeholder="Enter current password"
            />
          </label>
          <label>
            <div>New Password</div>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Enter new password (min 6 characters)"
            />
          </label>
          <label>
            <div>Confirm New Password</div>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
            />
          </label>
          <button className="btn small" type="submit" disabled={changingPassword}>
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* MFA Settings */}
      <div className="card">
        <h2>Multi-Factor Authentication (MFA)</h2>
        {mfaAction === null ? (
          <div>
            <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
              Status: <strong>{mfaEnabled ? 'Enabled' : 'Disabled'}</strong>
            </p>
            {!mfaEnabled ? (
              <div>
                <p style={{ marginBottom: '1rem' }}>
                  Protect your account with an extra layer of security. When enabled, you'll need to enter a code from your authenticator app when logging in.
                </p>
                <button className="btn small" onClick={startMFASetup} disabled={mfaLoading}>
                  {mfaLoading ? 'Loading...' : 'Enable MFA'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: '1rem' }}>
                  MFA is currently enabled. To disable it, you'll need to verify with a code from your authenticator app.
                </p>
                <button className="btn small" onClick={() => setMfaAction('disable')} disabled={mfaLoading}>
                  Disable MFA
                </button>
              </div>
            )}
          </div>
        ) : mfaAction === 'setup' ? (
          <div>
            <p style={{ marginBottom: '1rem' }}>Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.):</p>
            <div style={{ marginBottom: '1rem', background: '#fff', padding: '1rem', borderRadius: 8, display: 'inline-block' }}>
              <img src={mfaSetupData.qrCode} alt="MFA QR Code" style={{ display: 'block', width: 200, height: 200 }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Manual Entry Key:</div>
              <code style={{ background: 'rgba(255,255,255,0.05)', padding: '.5rem', borderRadius: 4, display: 'block', maxWidth: 520, wordBreak: 'break-all' }}>
                {mfaSetupData.secret}
              </code>
            </div>
            <div style={{ maxWidth: 520 }}>
              <label>
                <div>Verification Code</div>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </label>
              <div style={{ marginTop: '.5rem', display: 'flex', gap: '.5rem' }}>
                <button className="btn small" onClick={enableMFA} disabled={mfaLoading || mfaCode.length !== 6}>
                  {mfaLoading ? 'Verifying...' : 'Verify and Enable'}
                </button>
                <button className="btn small" onClick={cancelMFAAction} disabled={mfaLoading}>Cancel</button>
              </div>
            </div>
          </div>
        ) : mfaAction === 'disable' ? (
          <div style={{ maxWidth: 520 }}>
            <p style={{ marginBottom: '1rem' }}>Enter a code from your authenticator app to disable MFA:</p>
            <label>
              <div>Verification Code</div>
              <input
                type="text"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </label>
            <div style={{ marginTop: '.5rem', display: 'flex', gap: '.5rem' }}>
              <button className="btn small" onClick={disableMFA} disabled={mfaLoading || mfaCode.length !== 6}>
                {mfaLoading ? 'Verifying...' : 'Verify and Disable'}
              </button>
              <button className="btn small" onClick={cancelMFAAction} disabled={mfaLoading}>Cancel</button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Spotify Integration */}
      <div className="card" style={{ opacity: loading ? 0.7 : 1 }}>
        <h2>Spotify Integration</h2>
        {!linked ? (
          <div>
            <p>Your account is not linked to Spotify. Paste your tokens below to link.</p>
            <form onSubmit={onSubmitSpotify} style={{ display: 'grid', gap: '.5rem', maxWidth: 520 }}>
              <label>
                <div>Access Token</div>
                <input type="text" value={spotifyForm.accessToken} onChange={e => setSpotifyForm({ ...spotifyForm, accessToken: e.target.value })} placeholder="Spotify access token" />
              </label>
              <label>
                <div>Refresh Token (optional)</div>
                <input type="text" value={spotifyForm.refreshToken} onChange={e => setSpotifyForm({ ...spotifyForm, refreshToken: e.target.value })} placeholder="Spotify refresh token" />
              </label>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <label style={{ flex: 1 }}>
                  <div>Token Type</div>
                  <input type="text" value={spotifyForm.tokenType} onChange={e => setSpotifyForm({ ...spotifyForm, tokenType: e.target.value })} placeholder="Bearer" />
                </label>
                <label style={{ width: 180 }}>
                  <div>Expires In (sec)</div>
                  <input type="number" value={spotifyForm.expiresIn} onChange={e => setSpotifyForm({ ...spotifyForm, expiresIn: e.target.value })} />
                </label>
              </div>
              <label>
                <div>Scope (optional)</div>
                <input type="text" value={spotifyForm.scope} onChange={e => setSpotifyForm({ ...spotifyForm, scope: e.target.value })} placeholder="user-read-recently-played" />
              </label>
              <button className="btn small" type="submit" disabled={loading}>Link Spotify</button>
            </form>
          </div>
        ) : (
          <div>
            <p>Spotify is linked.</p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
              {me?.images?.[0]?.url ? (
                <img src={me.images[0].url} alt="avatar" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center' }}>🎵</div>
              )}
              <div>
                <div style={{ fontWeight: 700 }}>{me?.displayName || 'Spotify Account'}</div>
                <div style={{ opacity: .8 }}>{me?.email || me?.spotifyUserId}</div>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button className="btn small" onClick={() => setShowBackfillConfirm(true)} disabled={loading || backfilling}>Backfill streams</button>
            </div>
          </div>
        )}
      </div>

      {showBackfillConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'grid', placeItems: 'center' }}>
          <div style={{ background: '#181f2a', borderRadius: 12, padding: '1.5rem', width: 'min(520px, 90vw)', boxShadow: '0 2px 24px #0008' }}>
            <h3>Backfill Spotify Streams</h3>
            <p style={{ lineHeight: 1.5 }}>
              This will start a backfill job that repeatedly calls Spotify for your recently played tracks until no more streams can be found.
              This process may take some time and completeness is not guaranteed.
            </p>
            <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>Do you want to continue?</p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button className="btn small" onClick={() => setShowBackfillConfirm(false)} disabled={backfilling}>Cancel</button>
              <button className="btn small" onClick={startBackfill} disabled={backfilling}>{backfilling ? 'Starting…' : 'Start backfill'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
