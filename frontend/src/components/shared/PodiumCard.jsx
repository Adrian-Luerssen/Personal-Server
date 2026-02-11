import React from 'react'
import { AnimatedNumber } from './AnimatedNumber'
import { formatNumberShort } from './formatters'

const PODIUM_COLORS = {
  1: { border: '#FFD700', shine: '255,215,0' },
  2: { border: '#C0C0C0', shine: '192,192,192' },
  3: { border: '#CD7F32', shine: '205,127,50' },
}

export function PodiumCard({ data, rank, type, details }) {
  const podium = PODIUM_COLORS[rank]
  const borderColor = podium?.border || 'var(--glass-border)'
  const borderWidth = rank <= 3 ? '3px' : '1px'
  const shineColor = podium?.shine || '125,211,252'
  const img = details?.images?.[0]?.url || details?.album?.images?.[0]?.url
  const title = type === 'tracks'
    ? (details?.title || data.trackId)
    : type === 'albums'
      ? (details?.title || data.albumId)
      : type === 'playlists'
        ? (details?.title || details?.name || data.playlistId)
        : (details?.name || data.artistId)
  const subtitle = type === 'tracks'
    ? (details?.artists || '')
    : type === 'albums'
      ? (details?.artistName || '')
      : type === 'playlists'
        ? (details?.ownerName || details?.owner?.displayName || '')
        : ''

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        gap: '.75rem',
        position: 'relative',
        border: `${borderWidth} solid ${borderColor}`,
        overflow: 'hidden',
        animation: rank <= 3 ? 'shine 3s infinite' : undefined,
        boxShadow: rank <= 3 ? `0 0 20px rgba(${shineColor},0.5), 0 0 40px rgba(${shineColor},0.3)` : undefined
      }}
    >
      <div style={{
        position: 'absolute', top: 8, left: 8,
        width: 28, height: 28, borderRadius: '50%',
        background: borderColor,
        color: rank <= 3 ? '#000' : 'var(--color-accent)',
        display: 'grid', placeItems: 'center',
        fontWeight: 700, fontSize: '0.9rem', zIndex: 1,
        boxShadow: rank <= 3 ? '0 2px 8px rgba(0,0,0,0.3)' : undefined
      }}>
        {rank}
      </div>
      <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)', overflow: 'hidden', flexShrink: 0 }}>
        {img ? <img alt="cover" src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>🎧</div>}
      </div>
      <div style={{ flex: 1, paddingTop: '0.25rem', minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: podium?.border, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div style={{ color: 'var(--color-text-secondary)', fontSize: '.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
        <div style={{ marginTop: '.5rem', color: 'var(--color-text-secondary)' }}>
          Plays: <b><AnimatedNumber value={Number(data.count) || 0} formatter={formatNumberShort} /></b>
        </div>
      </div>
      {rank <= 3 && (
        <div style={{
          position: 'absolute', top: 0, left: '-100%',
          width: '100%', height: '100%',
          background: `linear-gradient(90deg, transparent, rgba(${shineColor},0.3), transparent)`,
          animation: 'slideShine 3s infinite',
          pointerEvents: 'none'
        }} />
      )}
    </div>
  )
}
