import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { useOutletContext } from 'react-router-dom'

export default function Profile() {
  const { sidebarCollapsed } = useOutletContext() || {}
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [linked, setLinked] = useState(false)
  const [me, setMe] = useState(null)
  const [showBackfillConfirm, setShowBackfillConfirm] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [form, setForm] = useState({
    accessToken: '',
    refreshToken: '',
    tokenType: 'Bearer',
    scope: '',
    expiresIn: 3600,
  })

  async function load() {
    setError('')
    setLoading(true)
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
      setError(e.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

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

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      // basic validation
      if (!form.accessToken) throw new Error('Access token is required')
      await api.post('/spotify/tokens', {
        accessToken: form.accessToken,
        refreshToken: form.refreshToken || undefined,
        tokenType: form.tokenType || undefined,
        scope: form.scope || undefined,
        expiresIn: form.expiresIn ? Number(form.expiresIn) : undefined,
      })
      await load()
    } catch (e) {
      setError(e.message || 'Failed to link Spotify')
    }
  }

  return (
    <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
      <h1>Profile</h1>
      {error && <div className="card" style={{ borderColor: 'rgba(255,0,0,0.2)' }}>{error}</div>}
      {info && <div className="card" style={{ borderColor: 'rgba(125,211,252,0.3)' }}>{info}</div>}

      <div className="card" style={{ opacity: loading ? 0.7 : 1 }}>
        <h2>Spotify</h2>
        {!linked ? (
          <div>
            <p>Your account is not linked to Spotify. Paste your tokens below to link.</p>
            <form onSubmit={onSubmit} style={{ display: 'grid', gap: '.5rem', maxWidth: 520 }}>
              <label>
                <div>Access Token</div>
                <input type="text" value={form.accessToken} onChange={e => setForm({ ...form, accessToken: e.target.value })} placeholder="Spotify access token" />
              </label>
              <label>
                <div>Refresh Token (optional)</div>
                <input type="text" value={form.refreshToken} onChange={e => setForm({ ...form, refreshToken: e.target.value })} placeholder="Spotify refresh token" />
              </label>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <label style={{ flex: 1 }}>
                  <div>Token Type</div>
                  <input type="text" value={form.tokenType} onChange={e => setForm({ ...form, tokenType: e.target.value })} placeholder="Bearer" />
                </label>
                <label style={{ width: 180 }}>
                  <div>Expires In (sec)</div>
                  <input type="number" value={form.expiresIn} onChange={e => setForm({ ...form, expiresIn: e.target.value })} />
                </label>
              </div>
              <label>
                <div>Scope (optional)</div>
                <input type="text" value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} placeholder="user-read-recently-played" />
              </label>
              <button className="btn" type="submit" disabled={loading}>Link Spotify</button>
            </form>
          </div>
        ) : (
          <div>
            <p>Spotify is linked.</p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
              <button className="btn" onClick={() => setShowBackfillConfirm(true)} disabled={loading || backfilling}>Backfill streams</button>
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
