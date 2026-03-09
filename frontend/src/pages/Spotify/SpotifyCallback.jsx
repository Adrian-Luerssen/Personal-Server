import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../api'
import { LoadingSpinner } from '../../components/shared'

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('No authorization code received from Spotify')
      return
    }

    apiFetch('/auth/spotify/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
      .then(() => navigate('/spotify/personal', { replace: true }))
      .catch((err) => setError(err.message || 'Failed to connect Spotify'))
  }, [])

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="alert-error">{error}</div>
        <button className="btn" onClick={() => navigate('/settings')}>Back to Settings</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <LoadingSpinner size={40} />
      <div style={{ color: 'var(--color-text-secondary)' }}>Connecting to Spotify...</div>
    </div>
  )
}
