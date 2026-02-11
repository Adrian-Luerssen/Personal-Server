import React, { useEffect, useRef, useState } from 'react'

function fmtTime(ms) {
  if (!ms || ms < 0 || isNaN(ms)) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function normalizeNowPlaying(raw) {
  if (!raw) return null
  const track = raw.track || raw.item || raw.current?.track || null
  const trackId = raw.trackId || track?.id || track?.uri || raw.id || raw.track_id || track?.external_ids?.isrc || track?.externalIds?.isrc || null
  const title = raw.title || track?.name || raw.trackName || ''
  const artistsArr = Array.isArray(raw.artists)
    ? raw.artists
    : (track?.artists?.map(a => a?.name).filter(Boolean)
        || (raw.artist ? [raw.artist] : (raw.artistName ? [raw.artistName] : [])))
  const albumObj = raw.album || track?.album
  const album = typeof albumObj === 'string' ? albumObj : (albumObj?.name || raw.albumName || '')
  const images = raw.images || albumObj?.images || track?.images || []
  const coverUrl = raw.coverUrl || raw.cover || raw.imageUrl || raw.image?.url || raw.albumImageUrl || images?.[0]?.url || track?.album?.images?.[0]?.url || null
  const albumArt = raw.albumArt || coverUrl || null
  const isPlaying = (typeof raw.isPlaying === 'boolean') ? raw.isPlaying : (raw.playing ?? raw.is_playing ?? true)
  const progressMs = raw.progressMs ?? raw.progress_ms ?? 0
  const durationMs = raw.durationMs ?? track?.durationMs ?? track?.duration_ms ?? raw.trackDurationMs ?? 0
  const changeKey = trackId || `${title}::${album}::${(images?.[0]?.url) || ''}`
  return { trackId, changeKey, title, artist: Array.isArray(artistsArr) ? artistsArr.join(', ') : (artistsArr || ''), artists: Array.isArray(artistsArr) ? artistsArr : (artistsArr ? [artistsArr] : []), album, images, albumArt, isPlaying, progressMs, durationMs }
}

export default function CurrentlyPlayingBox({ loading, data }) {
  const [displayed, setDisplayed] = useState(null)
  const [animating, setAnimating] = useState(false)
  const [nowTs, setNowTs] = useState(Date.now())

  useEffect(() => {
    if (!data) return
    const normalized = normalizeNowPlaying(data)
    if (!normalized) return
    if (!displayed || normalized?.changeKey !== displayed?.changeKey) {
      setAnimating(true)
      const t = setTimeout(() => {
        setDisplayed({ ...normalized, baseAt: Date.now(), baseProgressMs: normalized.progressMs || 0 })
        setAnimating(false)
      }, displayed ? 350 : 0)
      return () => clearTimeout(t)
    } else {
      setDisplayed(prev => {
        if (!prev) return { ...normalized, baseAt: Date.now(), baseProgressMs: normalized.progressMs || 0 }
        const next = { ...prev, isPlaying: normalized.isPlaying, durationMs: normalized.durationMs || prev.durationMs }
        const serverProg = typeof normalized.progressMs === 'number' ? normalized.progressMs : prev.progressMs
        const currentProg = typeof prev.baseProgressMs === 'number' && typeof prev.baseAt === 'number'
          ? prev.baseProgressMs + (prev.isPlaying ? (Date.now() - prev.baseAt) : 0)
          : (typeof prev.progressMs === 'number' ? prev.progressMs : 0)
        if (serverProg > currentProg + 500) {
          next.baseProgressMs = serverProg
          next.baseAt = Date.now()
        }
        return next
      })
    }
  }, [data])

  useEffect(() => {
    if (!displayed || displayed.isPlaying === false || !displayed.durationMs) return
    const id = setInterval(() => setNowTs(Date.now()), 250)
    return () => clearInterval(id)
  }, [displayed?.changeKey, displayed?.isPlaying, displayed?.durationMs])

  if (loading && !displayed) {
    return (
      <div className="card" style={{ minHeight: 80, height: '100%', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-accent-muted)', animation: 'pulse 1.2s infinite alternate' }} />
        <span style={{ color: 'var(--color-text-secondary)' }}>Loading currently playing...</span>
      </div>
    )
  }
  if (!displayed) return null

  const img = displayed?.albumArt || displayed?.images?.[0]?.url
  const title = displayed?.title || displayed?.trackName || 'No song playing'
  const artist = displayed?.artist || displayed?.artistName || (Array.isArray(displayed?.artists) ? displayed.artists.join(', ') : displayed?.artists) || ''
  const album = displayed?.album || displayed?.albumName || ''
  const duration = displayed?.durationMs || 0
  const baseAt = displayed?.baseAt || 0
  const baseProgress = typeof displayed?.baseProgressMs === 'number' ? displayed.baseProgressMs : (displayed?.progressMs || 0)
  const progress = displayed?.isPlaying && baseAt ? Math.min(duration, baseProgress + (nowTs - baseAt)) : baseProgress
  const pct = duration > 0 ? Math.max(0, Math.min(100, (progress / duration) * 100)) : 0

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', minHeight: 80, height: '100%', transition: 'opacity 0.35s', opacity: animating ? 0 : 1 }}>
      <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
        {img ? <img src={img} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="material-icons" style={{ fontSize: 32, color: 'var(--color-accent)' }}>music_note</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '.98rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist}</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '.95rem', marginTop: 2 }}>{album}</div>
        {duration > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ width: '100%', height: 6, background: 'var(--color-accent-muted)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.25s linear' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              <span>{fmtTime(progress)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>
        )}
      </div>
      {displayed?.isPlaying === false && <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: 14 }}>Paused</span>}
    </div>
  )
}
