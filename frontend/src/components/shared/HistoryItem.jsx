import React, { useEffect, useState } from 'react'
import { api } from '../../api'
import Icon from '../icons/Icon'

export function HistoryItem({ stream }) {
  const [details, setDetails] = useState(null)

  useEffect(() => {
    let mounted = true
    api.get(`/tracks/${stream.trackId}`)
      .then((d) => { if (mounted) setDetails(d) })
      .catch(() => {})
    return () => { mounted = false }
  }, [stream.trackId])

  const img = details?.images?.[0]?.url || details?.album?.images?.[0]?.url

  return (
    <li style={{
      display: 'flex',
      alignItems: 'center',
      gap: '.75rem',
      padding: '.3rem 0',
      borderBottom: '1px solid var(--glass-border)',
      minWidth: 0,
      maxWidth: '100%',
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-accent-muted)',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {img ? (
          <img alt="cover" src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <Icon name="headphones" size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}>
        <div style={{
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {stream.trackTitle || stream.trackId}{' '}
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
            {stream.artistName || ''}
          </span>
        </div>
        <div style={{
          fontSize: '.9rem',
          color: 'var(--color-text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {stream.platform} - {stream.streamedAt ? new Date(stream.streamedAt).toLocaleString() : ''}
        </div>
      </div>
    </li>
  )
}
