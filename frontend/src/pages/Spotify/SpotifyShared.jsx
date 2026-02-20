import React, { useEffect, useRef, useState } from 'react'
import { api } from '../../api'

export function LoadingLine({ width = 100 }) {
  return <div style={{ background: 'rgba(125,211,252,0.18)', height: 16, width, borderRadius: 6, margin: '4px 0', animation: 'pulse 1.2s infinite alternate' }} />
}

export function LoadingDot() {
  return <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(125,211,252,0.18)', animation: 'pulse 1.2s infinite alternate' }} />
}

export function HistoryModal({ onClose }) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [preloaded, setPreloaded] = useState([])
  const [preloading, setPreloading] = useState(false)
  const containerRef = useRef(null)

  async function fetchPage(pageNum) {
    const data = await api.get(`/streams/history?page=${pageNum}&pageSize=20`)
    return Array.isArray(data.items) ? data.items : data
  }

  useEffect(() => {
    if (!hasMore || preloading) return
    setPreloading(true)
    fetchPage(page + 1).then(nextItems => {
      setPreloaded(nextItems)
      setPreloading(false)
    }).catch(() => setPreloading(false))
  }, [page, hasMore])

  useEffect(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    setLoading(true)
    fetchPage(1).then(firstItems => {
      setItems(firstItems)
      setLoading(false)
      setHasMore(firstItems.length === 20)
    })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current
      if (!el || loading || !hasMore) return
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
        if (preloaded.length > 0) {
          setItems(prev => [...prev, ...preloaded])
          setPage(p => p + 1)
          setHasMore(preloaded.length === 20)
          setPreloaded([])
        } else {
          setLoading(true)
          fetchPage(page + 1).then(newItems => {
            setItems(prev => [...prev, ...newItems])
            setPage(p => p + 1)
            setLoading(false)
            setHasMore(newItems.length === 20)
          })
        }
      }
    }
    const el = containerRef.current
    if (el) el.addEventListener('scroll', handleScroll)
    return () => { if (el) el.removeEventListener('scroll', handleScroll) }
  }, [page, loading, hasMore, preloaded])

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'grid', placeItems: 'center' }}>
      <div style={{ background: '#181f2a', borderRadius: 12, padding: '2rem', minWidth: 340, maxWidth: 480, maxHeight: '80vh', boxShadow: '0 2px 24px #0008', position: 'relative' }}>
        <button className="btn small" style={{ position: 'absolute', top: 12, right: 12 }} onClick={onClose}>Close</button>
        <h3>All Recent Streams</h3>
        <div
          ref={containerRef}
          style={{
            overflowY: 'auto',
            maxHeight: '60vh',
            marginTop: '1rem',
            paddingRight: 8,
            scrollbarWidth: 'thin',
            scrollbarColor: '#7dd3fc #222',
          }}
          className="custom-scrollbar"
        >
          {items.length === 0 && loading ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {Array.from({ length: 8 }).map((_, i) => (<li key={i}><LoadingLine width={220} /></li>))}
            </ul>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.map((h, i) => (
                <HistoryItem key={h.id || i} stream={h} />
              ))}
            </ul>
          )}
          {loading && <LoadingLine width={180} />}
          {!hasMore && <div style={{ textAlign: 'center', opacity: .7, margin: '1rem 0' }}>End of history</div>}
        </div>
      </div>
    </div>
  )
}

function HistoryItem({ stream }) {
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
    <li style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
        {img ? <img alt="cover" src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>🎧</div>}
      </div>
      <div style={{ flex: 1 }}>
        <b>{stream.trackTitle || stream.trackId}</b> <span style={{ opacity: .7 }}>{stream.artistName || ''}</span>
        <div style={{ fontSize: '.95em', opacity: .7 }}>{stream.platform} • {stream.streamedAt ? new Date(stream.streamedAt).toLocaleString() : ''}</div>
      </div>
    </li>
  )
}

export function StatCard({ label, value }) {
  return (
    <div className="card" style={{ padding: '.75rem' }}>
      <div style={{ opacity: .8, fontSize: '.9rem' }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 800, fontSize: '1.4rem', minHeight: '2rem' }}>{value}</div>
    </div>
  )
}

// AnimatedNumber smoothly transitions between numeric values and shows a glow:
// - green glow when value increases
// - red glow when value decreases
export function AnimatedNumber({
  value = 0,
  formatter = (n) => String(n),
  durationMs = 800,
  decimals = 0,
  style,
}) {
  const [display, setDisplay] = useState(Number(value) || 0)
  const prevRef = useRef(Number(value) || 0)
  const rafRef = useRef(0)
  const glowTimeoutRef = useRef(0)
  const [glow, setGlow] = useState(null) // 'up' | 'down' | null

  useEffect(() => {
    const target = Number(value) || 0
    const start = prevRef.current
    if (target === start) return

    // determine direction and trigger glow briefly
    const direction = target > start ? 'up' : 'down'
    setGlow(direction)
    if (glowTimeoutRef.current) window.clearTimeout(glowTimeoutRef.current)
    glowTimeoutRef.current = window.setTimeout(() => setGlow(null), Math.min(durationMs + 200, 1200))

    const t0 = performance.now()
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
    const step = (now) => {
      const dt = Math.min(1, (now - t0) / durationMs)
      const eased = easeOutCubic(dt)
      const current = start + (target - start) * eased
      setDisplay(current)
      if (dt < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setDisplay(target)
        prevRef.current = target
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(step)
    // cleanup
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, durationMs])

  useEffect(() => () => { if (glowTimeoutRef.current) window.clearTimeout(glowTimeoutRef.current) }, [])

  const rounded = decimals > 0 ? Number(display.toFixed(decimals)) : Math.round(display)
  const green = 'rgba(74, 222, 128, 0.9)' // emerald-400
  const red = 'rgba(248, 113, 113, 0.9)' // red-400
  const textShadow = glow === 'up'
    ? `0 0 10px ${green}, 0 0 20px ${green}`
    : glow === 'down'
      ? `0 0 10px ${red}, 0 0 20px ${red}`
      : 'none'

  return (
    <span style={{ textShadow, transition: 'text-shadow 260ms ease', willChange: 'contents', ...style }}>
      {formatter(rounded)}
    </span>
  )
}

export function formatNumberShort(num) {
  if (num === null || num === undefined || isNaN(num)) return '0'
  const abs = Math.abs(num)
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(num % 1_000_000_000 === 0 ? 0 : 1) + 'B'
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + 'M'
  if (abs >= 1_000) return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + 'K'
  return String(num)
}

export function PodiumCard({ data, rank, type, details }) {
  const getBorderColor = () => {
    if (rank === 1) return '#FFD700'
    if (rank === 2) return '#C0C0C0'
    if (rank === 3) return '#CD7F32'
    return 'rgba(125,211,252,0.2)'
  }
  const getBorderWidth = () => (rank <= 3 ? '3px' : '1px')
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
  const getShineColor = () => {
    if (rank === 1) return '255,215,0'
    if (rank === 2) return '192,192,192'
    if (rank === 3) return '205,127,50'
    return '125,211,252'
  }
  const shineColor = getShineColor()
  return (
    <div 
      className="card" 
      style={{ 
        display: 'flex', 
        gap: '.75rem', 
        position: 'relative',
        border: `${getBorderWidth()} solid ${getBorderColor()}`,
        overflow: 'hidden',
        animation: rank <= 3 ? 'shine 3s infinite' : undefined,
        boxShadow: rank <= 3 ? `0 0 20px rgba(${shineColor},0.5), 0 0 40px rgba(${shineColor},0.3)` : undefined
      }}
    >
      <div style={{
        position: 'absolute',
        top: 8,
        left: 8,
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: getBorderColor(),
        color: rank <= 3 ? '#000' : '#7dd3fc',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: '0.9rem',
        zIndex: 1,
        boxShadow: rank <= 3 ? '0 2px 8px rgba(0,0,0,0.3)' : undefined
      }}>
        {rank}
      </div>
      
      <div style={{ width: 64, height: 64, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
        {img ? <img alt="cover" src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>🎧</div>}
      </div>
      <div style={{ flex: 1, paddingTop: '0.25rem' }}>
        <div style={{ fontWeight: 700, color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : undefined }}>{title}</div>
        {subtitle && <div style={{ opacity: .8, fontSize: '.95rem' }}>{subtitle}</div>}
        <div style={{ marginTop: '.5rem', opacity: .9 }}>
          Plays: <b><AnimatedNumber value={Number(data.count) || 0} formatter={formatNumberShort} /></b>
        </div>
      </div>
      {rank <= 3 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, rgba(${shineColor},0.3), transparent)`,
          animation: 'slideShine 3s infinite',
          pointerEvents: 'none'
        }} />
      )}
    </div>
  )
}

export function formatDuration(ms) {
  if (!ms || isNaN(ms)) return '0m'
  const minutes = Math.floor(ms / 1000 / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ${hours % 24}h`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ${days % 7}d`
  const months = Math.floor(weeks / 4.345)
  if (months < 12) return `${months}mo ${weeks % 4}w`
  const years = Math.floor(months / 12)
  return `${years}y ${months % 12}mo`
}
