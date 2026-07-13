import React, { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getApiBase } from '../../config'
import { getTokens } from '../../auth'
import { useSearchParams } from 'react-router-dom'
import CurrentlyPlayingBox from '../../components/CurrentlyPlayingBox'
import { Line, PolarArea } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { applyChartTheme } from '../../chartTheme'
import { api } from '../../api'
import Icon from '../../components/icons/Icon'
import ScrollReveal from '../../components/ScrollReveal'
import PageHeader from '../../components/PageHeader'
import '../../custom-scrollbar.css'
import {
  LoadingDot,
  LoadingLine,
  HistoryModal,
  HistoryItem,
  StatCard,
  AnimatedNumber,
  formatDuration,
  formatNumberShort,
} from '../../components/shared'
import { getListeningArtworkUrl, getRankMovement, normalizeSpotifyTimeframe } from '../../spotifyRanking.mjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
  Filler
)
applyChartTheme()

const TIMEFRAMES = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
]

function ListeningRankRow({ data, details, rank, type }) {
  const artwork = getListeningArtworkUrl(details)
  const movement = getRankMovement({ ...data, rank })
  const title = type === 'tracks'
    ? (details?.title || data.trackId)
    : type === 'albums'
      ? (details?.title || data.albumId)
      : type === 'playlists'
        ? (details?.title || details?.name || data.playlistId)
        : (details?.name || data.artistId)
  const subtitle = type === 'tracks'
    ? details?.artists
    : type === 'albums'
      ? details?.artistName
      : type === 'playlists'
        ? (details?.ownerName || details?.owner?.displayName)
        : 'Artist'

  return (
    <article className="listening-rank-row">
      <span className="listening-rank-row__rank">{String(rank).padStart(2, '0')}</span>
      <div className="listening-rank-row__artwork">
        {artwork ? <img src={artwork} alt="" loading="lazy" /> : <Icon name="headphones" size={20} />}
      </div>
      <div className="listening-rank-row__copy">
        <strong>{title}</strong>
        <span>{subtitle || type}</span>
      </div>
      <span className={`listening-rank-row__movement is-${movement.direction}`} aria-label={movement.label}>
        {movement.direction === 'up' ? '↑' : movement.direction === 'down' ? '↓' : movement.direction === 'new' ? 'new' : '—'}
        {movement.delta ? movement.delta : ''}
      </span>
      <div className="listening-rank-row__plays">
        <strong>{formatNumberShort(Number(data.count) || 0)}</strong>
        <span>plays</span>
      </div>
    </article>
  )
}

export default function SpotifyPersonal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const avatarUrl = profile?.images?.[0]?.url
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null)
  const [currentlyPlayingLoading, setCurrentlyPlayingLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const hasLoadedOnceRef = useRef(false)
  useEffect(() => { hasLoadedOnceRef.current = hasLoadedOnce }, [hasLoadedOnce])
  const [error, setError] = useState('')
  const [linked, setLinked] = useState(null)
  const [betaAccess, setBetaAccess] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [topTracks, setTopTracks] = useState([])
  const [topAlbums, setTopAlbums] = useState([])
  const [topArtists, setTopArtists] = useState([])
  const [topPlaylists, setTopPlaylists] = useState([])
  const [topTrackDetails, setTopTrackDetails] = useState([])
  const [topAlbumDetails, setTopAlbumDetails] = useState([])
  const [topArtistDetails, setTopArtistDetails] = useState([])
  const [topPlaylistDetails, setTopPlaylistDetails] = useState([])
  const [topCategory, setTopCategory] = useState('tracks')
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const initialTf = normalizeSpotifyTimeframe(searchParams.get('tf'), 'today')
  const initialFrom = searchParams.get('from') || ''
  const initialTo = searchParams.get('to') || ''
  const [timeframe, setTimeframe] = useState(initialTf)
  const [customStart, setCustomStart] = useState(initialFrom)
  const [customEnd, setCustomEnd] = useState(initialTo)
  const [perDay, setPerDay] = useState([])
  const [perHour, setPerHour] = useState([])
  const [moodData, setMoodData] = useState(null)

  const timeframeRef = useRef(timeframe)
  const customStartRef = useRef(customStart)
  const customEndRef = useRef(customEnd)
  const loadRequestIdRef = useRef(0)

  useEffect(() => { timeframeRef.current = timeframe }, [timeframe])
  useEffect(() => { customStartRef.current = customStart }, [customStart])
  useEffect(() => { customEndRef.current = customEnd }, [customEnd])

  // Sync URL query with timeframe
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('tf', timeframe)
    if (timeframe === 'custom') {
      if (customStart) next.set('from', customStart); else next.delete('from')
      if (customEnd) next.set('to', customEnd); else next.delete('to')
    } else {
      next.delete('from'); next.delete('to')
    }
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, customStart, customEnd])

  // Consolidated load: fetches link status, profile, stats, tops, history, charts
  async function load() {
    const myId = ++loadRequestIdRef.current
    setError('')
    if (!hasLoadedOnceRef.current) setLoading(true)
    try {
      const linkStatus = await api.get('/spotify/linked')
      setLinked(!!linkStatus?.linked)
      setBetaAccess(linkStatus?.betaAccess || null)
      if (!linkStatus?.linked) {
        setProfile(null)
        setTopTracks([]); setTopAlbums([]); setTopArtists([]); setTopPlaylists([])
        setStats(null); setHistory([]); setPerDay([]); setPerHour([])
        if (!hasLoadedOnceRef.current) { setHasLoadedOnce(true); hasLoadedOnceRef.current = true }
        return
      }

      const currentTimeframe = timeframeRef.current
      const currentStart = customStartRef.current
      const currentEnd = customEndRef.current
      let statsParams = ''
      if (currentTimeframe === 'custom' && currentStart && currentEnd) {
        statsParams = `?start=${currentStart}&end=${currentEnd}`
      } else if (currentTimeframe !== 'all') {
        statsParams = `?timeframe=${currentTimeframe}`
      }

      const [me, topTracksData, topAlbumsData, topArtistsData, topPlaylistsData, statsData, historyData, perDayData, perHourData, moodResult] = await Promise.all([
        api.get('/spotify/me'),
        api.get('/streams/top?platform=spotify&limit=10&type=track' + (statsParams ? '&' + statsParams.slice(1) : '')),
        api.get('/albums/top-albums?platform=spotify&limit=10' + (statsParams ? '&' + statsParams.slice(1) : '')),
        api.get('/artists/top-artists?platform=spotify&limit=10' + (statsParams ? '&' + statsParams.slice(1) : '')),
        api.get('/playlists/top-playlists?platform=spotify&limit=10' + (statsParams ? '&' + statsParams.slice(1) : '')),
        api.get('/streams/stats' + statsParams),
        api.get('/streams/history?page=1&pageSize=10'),
        api.get('/streams/per-day' + statsParams),
        api.get('/streams/per-hour' + statsParams),
        api.get('/streams/mood' + statsParams),
      ])
      if (loadRequestIdRef.current !== myId) return
      setProfile(me)
      setTopTracks(topTracksData)
      setTopAlbums(topAlbumsData)
      setTopArtists(topArtistsData)
      setTopPlaylists(topPlaylistsData)
      setStats(statsData)
      setHistory(Array.isArray(historyData.items) ? historyData.items : historyData)
      setPerDay(perDayData)
      setPerHour(perHourData)
      setMoodData(moodResult)

      const [trackDetails, albumDetails, artistDetails, playlistDetails] = await Promise.all([
        Promise.all((topTracksData || []).map(t => api.get(`/tracks/${t.trackId}`))),
        Promise.all((topAlbumsData || []).map(a => api.get(`/albums/${a.albumId}`))),
        Promise.all((topArtistsData || []).map(a => api.get(`/artists/${a.artistId}`))),
        Promise.all((topPlaylistsData || []).map(p => api.get(`/playlists/${p.playlistId}`)))
      ])
      if (loadRequestIdRef.current !== myId) return
      setTopTrackDetails(trackDetails)
      setTopAlbumDetails(albumDetails)
      setTopArtistDetails(artistDetails)
      setTopPlaylistDetails(playlistDetails)

      if (!hasLoadedOnceRef.current) { setHasLoadedOnce(true); hasLoadedOnceRef.current = true }
    } catch (e) {
      setError(e.message || 'Failed to load Spotify data')
    } finally {
      setLoading(false)
    }
  }

  // Load on mount and when timeframe changes
  useEffect(() => { load() }, [timeframe, customStart, customEnd])

  // WebSocket: subscribe to current track updates
  useEffect(() => {
    let mounted = true
    let socket
    setCurrentlyPlayingLoading(true)
    try {
      const base = getApiBase()
      const url = new URL(base)
      const wsOrigin = `${url.protocol === 'https:' ? 'wss' : 'ws'}://${url.host}`
      socket = io(wsOrigin + '/ws', { transports: ['websocket'] })
      socket.on('connect', () => {
        const { accessToken } = getTokens()
        if (accessToken) socket.emit('spotify:subscribeCurrent', { accessToken })
      })
      socket.on('spotify:current', (payload) => {
        if (!mounted) return
        setCurrentlyPlaying(payload)
        setCurrentlyPlayingLoading(false)
      })
      socket.on('spotify:error', () => {
        api.get('/spotify/currently-playing')
          .then(d => { if (mounted) setCurrentlyPlaying(d) })
          .finally(() => { if (mounted) setCurrentlyPlayingLoading(false) })
      })
    } catch {
      api.get('/spotify/currently-playing')
        .then(d => { if (mounted) setCurrentlyPlaying(d) })
        .finally(() => { if (mounted) setCurrentlyPlayingLoading(false) })
    }
    return () => { mounted = false; if (socket) socket.disconnect() }
  }, [])

  // Single background sync + refresh every 2 minutes
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        await api.post('/spotify/sync-streams')
        await load()
      } catch { /* ignore background errors */ }
    }, 120000)
    return () => clearInterval(id)
  }, [])

  // Chart data: streams per day
  const lineData = useMemo(() => {
    if (!perDay || perDay.length === 0) return null
    return {
      labels: perDay.map(d => d.date),
      datasets: [{
        label: 'Streams per Day',
        data: perDay.map(d => d.count),
        fill: false,
        borderColor: '#7dd3fc',
        backgroundColor: 'rgba(125,211,252,0.2)',
        tension: 0.3,
      }]
    }
  }, [perDay])

  // Chart data: listening clock (polar area)
  const wheelData = useMemo(() => {
    if (!perHour || perHour.length === 0) return null
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const hourCounts = hours.map(h => {
      const found = perHour.find(d => Number(d.hour) === h)
      return found ? found.count : 0
    })
    return {
      labels: hours.map(h => `${h}:00`),
      datasets: [{
        label: 'Streams per Hour',
        data: hourCounts,
        backgroundColor: hours.map((_, i) => `hsl(${i * 15}, 80%, 60%)`),
        borderWidth: 1,
      }]
    }
  }, [perHour])

  async function toggleTracking() {
    if (!profile) return
    try {
      const next = !profile.streamTrackingEnabled
      await api.post('/spotify/stream-tracking', { enabled: next })
      setProfile({ ...profile, streamTrackingEnabled: next })
    } catch (e) {
      setError(e.message || 'Failed to update stream tracking')
    }
  }

  async function syncLatest() {
    setSyncing(true)
    setError('')
    try {
      await api.post('/spotify/sync-streams')
      await load()
    } catch (e) {
      setError(e.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const topItems = topCategory === 'tracks' ? topTracks
    : topCategory === 'albums' ? topAlbums
    : topCategory === 'artists' ? topArtists
    : topPlaylists

  const topDetails = topCategory === 'tracks' ? topTrackDetails
    : topCategory === 'albums' ? topAlbumDetails
    : topCategory === 'artists' ? topArtistDetails
    : topPlaylistDetails

  return (
    <div className="spotify-insights">
      <PageHeader icon="music" title="Spotify" />

      <ScrollReveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', alignItems: 'stretch', marginBottom: '2rem' }}>
        <CurrentlyPlayingBox loading={currentlyPlayingLoading} data={currentlyPlaying} />
        <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', height: '100%' }}>
          {loading ? (
            <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)', display: 'grid', placeItems: 'center' }}><LoadingDot /></div>
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)', display: 'grid', placeItems: 'center' }}>
              <Icon name="music" size={28} style={{ color: 'var(--color-accent)' }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{loading ? <LoadingLine width={120} /> : (profile?.displayName || 'Spotify Account')}</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>{loading ? <LoadingLine width={160} /> : (profile?.email || profile?.spotifyUserId || 'Not linked yet')}</div>
            <div style={{ marginTop: '.5rem', display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn small" onClick={toggleTracking} disabled={loading}>
                {profile?.streamTrackingEnabled ? 'Disable tracking' : 'Enable tracking'}
              </button>
              <button className="btn small" onClick={syncLatest} disabled={syncing || loading}>
                {syncing ? 'Syncing...' : 'Sync latest plays'}
              </button>
            </div>
          </div>
        </div>
      </div>
      </ScrollReveal>

      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {!linked && linked !== null && (
        <div className="alert-warning">
          Your account is not linked to Spotify.<br />
          {betaAccess?.enabled
            ? 'Spotify is currently in beta. Link an approved tester account in Settings > Connections.'
            : 'Link your Spotify account in Settings > Connections.'}
        </div>
      )}

      {(linked || linked === null) && (
        <>
          <div className="card spotify-timeframe-register" style={{ marginBottom: '1rem' }}>
            <div className="tab-group">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  className={`tab-btn${timeframe === tf.value ? ' active' : ''}`}
                  onClick={() => setTimeframe(tf.value)}
                >{tf.label}</button>
              ))}
            </div>
            {timeframe === 'custom' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginTop: '1rem' }}>
                <input type="date" className="input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                <span style={{ color: 'var(--color-text-secondary)' }}>to</span>
                <input type="date" className="input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
            )}
          </div>

          <ScrollReveal delay={100}>
          <div className="section">
            <h3>General Statistics</h3>
            <div className="stat-grid">
              <StatCard icon="play-circle" accentColor="var(--color-accent)" label="Total Streams" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={stats?.totalStreams ?? 0} formatter={formatNumberShort} />} />
              <StatCard icon="disc" accentColor="var(--color-accent)" label="Unique Tracks" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={stats?.uniqueTracks ?? 0} formatter={formatNumberShort} />} />
              <StatCard icon="mic" accentColor="var(--color-accent)" label="Unique Artists" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={stats?.uniqueArtists ?? 0} formatter={formatNumberShort} />} />
              <StatCard icon="clock" accentColor="var(--color-accent)" label="Total Minutes" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={Math.floor((stats?.msListened ?? 0) / 1000 / 60)} formatter={formatNumberShort} />} />
              <StatCard icon="timer" accentColor="var(--color-accent)" label="Total Time" value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={stats?.msListened ?? 0} formatter={formatDuration} />} />
            </div>

            <div style={{ marginTop: '1rem', height: 240, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!hasLoadedOnce ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <LoadingDot />
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading chart data...</div>
                </div>
              ) : lineData ? (
                <div style={{ width: '100%', height: '100%' }}>
                  <Line data={lineData} options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    maintainAspectRatio: false,
                    scales: {
                      x: { grid: { color: 'rgba(125,211,252,0.1)' }, ticks: { color: 'rgba(125,211,252,0.5)' } },
                      y: { grid: { color: 'rgba(125,211,252,0.1)' }, ticks: { color: 'rgba(125,211,252,0.5)' }, min: 0 }
                    }
                  }} style={{ width: '100%', height: '100%' }} />
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 18, textAlign: 'center' }}>No stream data for graph.</div>
              )}
            </div>

            <div className="spotify-clock-row" style={{ marginTop: '2rem', width: '100%', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'stretch' }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-accent)', marginBottom: 8, textAlign: 'center' }}>Listening Clock</div>
                <div className="spotify-clock-chart" style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxWidth: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, boxSizing: 'border-box' }}>
                  {!hasLoadedOnce ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <LoadingDot />
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading...</div>
                    </div>
                  ) : wheelData ? (
                    <>
                      <PolarArea data={wheelData} options={{
                        responsive: true,
                        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } } },
                        maintainAspectRatio: false,
                        scales: { r: { grid: { display: true, color: 'rgba(125,211,252,0.13)' }, pointLabels: { color: 'rgba(125,211,252,0.7)', font: { size: 13, weight: 'bold' } }, ticks: { display: false }, angleLines: { color: 'rgba(125,211,252,0.1)' } } }
                      }} style={{ width: '100%', height: '100%' }} />
                      <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 15 }}>00</div>
                      <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 15 }}>06</div>
                      <div style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 15 }}>12</div>
                      <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 15 }}>18</div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 18, textAlign: 'center' }}>No hourly data for chart.</div>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}>
                <div className="spotify-mood-summary">
                  <div>
                    <span>Sound profile</span>
                    <strong>{moodData?.averages?.bpm ? `${moodData.averages.bpm} BPM` : 'No mood data'}</strong>
                  </div>
                  {[
                    { key: 'energy', label: 'Energy', color: '#f97316' },
                    { key: 'danceability', label: 'Dance', color: '#a78bfa' },
                    { key: 'valence', label: 'Mood', color: '#fbbf24' },
                    { key: 'acousticness', label: 'Acoustic', color: '#4ade80' },
                  ].map(item => {
                    const value = Math.round((moodData?.averages?.[item.key] || 0) * 100)
                    return (
                      <div className="spotify-mood-summary__row" key={item.key}>
                        <span>{item.label}</span>
                        <div>
                          <i style={{ width: `${value}%`, background: item.color }} />
                        </div>
                        <em>{value}%</em>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
          <div className="section">
            <div className="card spotify-rankings-register">
              <h3>Recent Streaming History</h3>
              <div style={{ maxHeight: 120, overflowY: 'auto' }} className="custom-scrollbar">
                {!hasLoadedOnce ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} style={{ padding: '.3rem 0', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: 'var(--color-accent-muted)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}><LoadingLine width={220} /><LoadingLine width={150} /></div>
                      </li>
                    ))}
                  </ul>
                ) : history && history.length ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {history.map((h, i) => <HistoryItem key={h.id || i} stream={h} />)}
                  </ul>
                ) : <div className="empty-state">No recent streams.</div>}
              </div>
              <button className="btn small" style={{ marginTop: '0.5rem' }} onClick={() => setShowHistoryModal(true)}>Show all recent streams</button>
            </div>
          </div>
          </ScrollReveal>

          {showHistoryModal && <HistoryModal onClose={() => setShowHistoryModal(false)} />}

          <ScrollReveal delay={300}>
          <div className="section">
            <div className="card">
              <div className="tab-group" style={{ marginBottom: '1rem' }}>
                {['tracks', 'albums', 'artists', 'playlists'].map(cat => (
                  <button
                    key={cat}
                    className={`tab-btn${topCategory === cat ? ' active' : ''}`}
                    onClick={() => setTopCategory(cat)}
                  >Top {cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
                ))}
              </div>
              <div className="listening-ranking-list">
                {topItems.length === 0 ? (
                  <div className="empty-state">No top {topCategory} yet.</div>
                ) : topItems.map((item, idx) => (
                  <ListeningRankRow
                    key={item.trackId || item.albumId || item.artistId || item.playlistId}
                    data={item}
                    details={topDetails[idx]}
                    rank={idx + 1}
                    type={topCategory}
                  />
                ))}
              </div>
            </div>
          </div>
          </ScrollReveal>

          {/* Mood & Energy Analysis */}
          {moodData?.averages && (
            <ScrollReveal delay={400}>
              <div className="section" style={{ marginTop: '1.5rem' }}>
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Icon name="heart" size={20} />
                    Mood & Energy Analysis
                  </h3>

                  {/* Audio feature bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {[
                      { key: 'energy', label: 'Energy', color: '#f97316', icon: 'zap' },
                      { key: 'danceability', label: 'Danceability', color: '#a78bfa', icon: 'music' },
                      { key: 'valence', label: 'Happiness', color: '#fbbf24', icon: 'smile' },
                      { key: 'acousticness', label: 'Acoustic', color: '#4ade80', icon: 'guitar' },
                      { key: 'instrumentalness', label: 'Instrumental', color: '#60a5fa', icon: 'piano' },
                      { key: 'speechiness', label: 'Speechiness', color: '#f472b6', icon: 'mic' },
                    ].map(feat => {
                      const val = moodData.averages[feat.key] || 0
                      const pct = Math.round(val * 100)
                      return (
                        <div key={feat.key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Icon name={feat.icon} size={12} style={{ color: feat.color }} />
                              {feat.label}
                            </span>
                            <span style={{ fontWeight: 700, color: feat.color }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 3,
                              width: `${pct}%`, background: feat.color,
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* BPM and distribution */}
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    {moodData.averages.bpm > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>{moodData.averages.bpm}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Avg BPM</div>
                      </div>
                    )}
                    {moodData.distribution?.energy && (
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Energy Distribution</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[
                            { label: 'Chill', value: moodData.distribution.energy.low, color: '#60a5fa' },
                            { label: 'Medium', value: moodData.distribution.energy.medium, color: '#fbbf24' },
                            { label: 'High', value: moodData.distribution.energy.high, color: '#f97316' },
                          ].map(b => {
                            const total = moodData.distribution.energy.low + moodData.distribution.energy.medium + moodData.distribution.energy.high
                            const pct = total > 0 ? Math.round((b.value / total) * 100) : 0
                            return (
                              <div key={b.label} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: b.color }}>{pct}%</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{b.label}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {moodData.distribution?.mood && (
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Mood Distribution</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[
                            { label: 'Melancholy', value: moodData.distribution.mood.sad, color: '#60a5fa' },
                            { label: 'Neutral', value: moodData.distribution.mood.neutral, color: '#a78bfa' },
                            { label: 'Happy', value: moodData.distribution.mood.happy, color: '#fbbf24' },
                          ].map(b => {
                            const total = moodData.distribution.mood.sad + moodData.distribution.mood.neutral + moodData.distribution.mood.happy
                            const pct = total > 0 ? Math.round((b.value / total) * 100) : 0
                            return (
                              <div key={b.label} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: b.color }}>{pct}%</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{b.label}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
                    Based on {moodData.totalTracks} tracks with audio feature data
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}
        </>
      )}
    </div>
  )
}
