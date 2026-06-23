import React, { useEffect, useState } from 'react'
import { api } from '../../api'
import { LoadingSpinner } from '../../components/shared'
import Icon from '../../components/icons/Icon'

const SPOTIFY_ERROR_MESSAGES = {
  missing_code_or_state: 'Spotify did not return the information needed to complete linking. Please try connecting again.',
  invalid_state: 'Spotify returned an invalid linking session. Please start the connection again from this page.',
  token_exchange_failed: 'Spotify linking failed while exchanging the authorization code. Please try again.',
  spotify_beta_access_denied: 'Spotify is currently in beta. This Spotify account is not on the approved tester list.',
  access_denied: 'Spotify access was not approved. You can retry the connection when ready.',
}

function formatSpotifyError(error) {
  if (!error) return ''
  return SPOTIFY_ERROR_MESSAGES[error] || error
}

export default function Connections({ initialError = '' }) {
  const [loading, setLoading] = useState(true)
  const [linked, setLinked] = useState(false)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(formatSpotifyError(initialError))
  const [betaAccess, setBetaAccess] = useState(null)
  const [subTab, setSubTab] = useState('oauth')

  // Manual token fields
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    if (initialError) setError(formatSpotifyError(initialError))
  }, [initialError])

  const loadStatus = async ({ preserveError = false } = {}) => {
    setLoading(true)
    if (!preserveError) setError('')
    try {
      const [linkRes, profileRes] = await Promise.all([
        api.get('/spotify/linked'),
        api.get('/spotify/me').catch(() => null),
      ])
      setLinked(linkRes?.linked || false)
      setBetaAccess(linkRes?.betaAccess || null)
      setProfile(profileRes)
    } catch (e) {
      setError(e.message || 'Failed to load connection status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus({ preserveError: Boolean(initialError) })
  }, [initialError])

  const handleOAuthConnect = async () => {
    setError('')
    try {
      const res = await api.get('/auth/spotify/link')
      if (res?.url) {
        window.location.href = res.url
      } else {
        setError('Failed to get Spotify authorization URL')
      }
    } catch (e) {
      setError(e.message || 'Failed to initiate Spotify connection')
    }
  }

  const handleManualSave = async () => {
    if (!accessToken.trim()) {
      setError('Access token is required')
      return
    }
    setSaving(true)
    setError('')
    setSaveMsg('')
    try {
      await api.post('/spotify/tokens', {
        accessToken: accessToken.trim(),
        refreshToken: refreshToken.trim() || undefined,
      })
      setSaveMsg('Tokens saved successfully')
      setAccessToken('')
      setRefreshToken('')
      await loadStatus()
    } catch (e) {
      setError(e.message || 'Failed to save tokens')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    setError('')
    try {
      await api.post('/spotify/tokens', {
        accessToken: '',
        refreshToken: '',
      })
      setLinked(false)
      setProfile(null)
    } catch (e) {
      setError(e.message || 'Failed to disconnect')
    }
  }

  if (loading) {
    return (
      <div className="card section">
        <div className="loading-center" style={{ minHeight: '150px' }}>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="card section">
      <h2 style={{ marginBottom: '0.25rem' }}>Spotify Connection</h2>
      <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.9rem', marginBottom: '1rem' }}>
        Connect your Spotify account to track listening history and view stats
      </p>

      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {saveMsg && <div className="alert-success" style={{ marginBottom: '1rem' }}>{saveMsg}</div>}
      {betaAccess?.enabled && (
        <div className="alert-warning" style={{ marginBottom: '1rem' }}>
          <strong>Spotify beta access</strong>
          <div style={{ marginTop: '0.25rem' }}>
            Spotify is limited to approved beta testers while this app uses Spotify development mode.
            {betaAccess.limit ? ` Current cap: ${betaAccess.limit} users.` : ''}
            {betaAccess.enforced
              ? ' Only approved Spotify accounts can be linked.'
              : ' Configure the approved tester list on the server to enforce access.'}
          </div>
        </div>
      )}

      {linked && profile ? (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            background: 'rgba(0,0,0,0.1)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}>
            {profile.images?.[0]?.url ? (
              <img
                src={profile.images[0].url}
                alt="Spotify profile"
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--color-accent-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon name="user" size={20} style={{ color: 'var(--color-accent)' }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {profile.displayName || profile.spotifyUserId || 'Connected'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {profile.email || 'Spotify account linked'}
              </div>
            </div>
            <span className="badge" style={{ background: 'var(--color-success-muted)', color: 'var(--color-success)' }}>
              Connected
            </span>
            {betaAccess?.enabled && (
              <span className="badge" style={{ background: 'var(--color-warning-muted)', color: 'var(--color-warning)' }}>
                Beta
              </span>
            )}
          </div>

          <button className="btn btn-ghost btn-danger" onClick={handleDisconnect}>
            <Icon name="unlink" size={16} style={{ marginRight: '4px' }} />
            Disconnect Spotify
          </button>
        </div>
      ) : (
        <div>
          {/* Sub-tabs for connection method */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              className={`btn small ${subTab === 'oauth' ? '' : 'btn-ghost'}`}
              onClick={() => setSubTab('oauth')}
            >
              <Icon name="lock-open" size={16} style={{ marginRight: '4px' }} />
              OAuth
            </button>
            <button
              className={`btn small ${subTab === 'manual' ? '' : 'btn-ghost'}`}
              onClick={() => setSubTab('manual')}
            >
              <Icon name="key-round" size={16} style={{ marginRight: '4px' }} />
              Manual
            </button>
          </div>

          {subTab === 'oauth' && (
            <div style={{
              padding: '1.5rem',
              background: 'rgba(0,0,0,0.1)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}>
              <Icon name="music" size={48} style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'block' }} />
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Securely connect your Spotify account using OAuth. You'll be redirected to Spotify to authorize access.
                {betaAccess?.enabled ? ' Use an approved beta tester Spotify account.' : ''}
              </p>
              <button className="btn" onClick={handleOAuthConnect}>
                <Icon name="link" size={16} style={{ marginRight: '4px' }} />
                Connect with Spotify
              </button>
            </div>
          )}

          {subTab === 'manual' && (
            <div style={{
              padding: '1.5rem',
              background: 'rgba(0,0,0,0.1)',
              borderRadius: 'var(--radius-md)',
            }}>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Manually enter your Spotify API tokens. Use this if OAuth redirect is not available.
              </p>
              <div className="field">
                <label>Access Token</label>
                <input
                  className="input"
                  type="text"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Paste your Spotify access token"
                />
              </div>
              <div className="field">
                <label>Refresh Token</label>
                <input
                  className="input"
                  type="text"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="Paste your Spotify refresh token (optional)"
                />
              </div>
              <button className="btn" onClick={handleManualSave} disabled={saving} style={{ marginTop: '0.5rem' }}>
                {saving ? 'Saving...' : 'Save Tokens'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
