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
import { PageHeading, StatePanel, SummaryItem, SummaryStrip } from '../../components/record'
import {
  LoadingDot,
  LoadingLine,
  HistoryModal,
  HistoryItem,
  formatDuration,
  formatNumberShort,
} from '../../components/shared'
import { getListeningArtworkUrl, getRankMovement, normalizeSpotifyTimeframe } from '../../spotifyRanking.mjs'
import { normalizeListeningCollection } from './spotifyResponseModel.mjs'

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
      const tracks = normalizeListeningCollection(topTracksData).filter(item => item.trackId)
      const albums = normalizeListeningCollection(topAlbumsData).filter(item => item.albumId)
      const artists = normalizeListeningCollection(topArtistsData).filter(item => item.artistId)
      const playlists = normalizeListeningCollection(topPlaylistsData).filter(item => item.playlistId)
      setTopTracks(tracks)
      setTopAlbums(albums)
      setTopArtists(artists)
      setTopPlaylists(playlists)
      setStats(statsData)
      setHistory(normalizeListeningCollection(historyData))
      setPerDay(normalizeListeningCollection(perDayData).filter(item => item.date))
      setPerHour(normalizeListeningCollection(perHourData).filter(item => Number.isFinite(Number(item.hour))))
      setMoodData(moodResult && typeof moodResult === 'object' && !Array.isArray(moodResult) ? moodResult : null)

      const [trackDetails, albumDetails, artistDetails, playlistDetails] = await Promise.all([
        Promise.all(tracks.map(t => api.get(`/tracks/${t.trackId}`).catch(() => null))),
        Promise.all(albums.map(a => api.get(`/albums/${a.albumId}`).catch(() => null))),
        Promise.all(artists.map(a => api.get(`/artists/${a.artistId}`).catch(() => null))),
        Promise.all(playlists.map(p => api.get(`/playlists/${p.playlistId}`).catch(() => null)))
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
        borderColor: '#7c5cff',
        backgroundColor: 'rgba(124,92,255,0.18)',
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
        backgroundColor: hours.map((_, i) => `rgba(124,92,255,${0.24 + ((i % 6) * 0.1)})`),
        borderColor: '#121216',
        borderWidth: 2,
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

  const periodLabel = TIMEFRAMES.find(item => item.value === timeframe)?.label || 'Today'
  const soundMeasures = [
    ['energy', 'Energy'],
    ['danceability', 'Dance'],
    ['valence', 'Mood'],
    ['acousticness', 'Acoustic'],
    ['instrumentalness', 'Instrumental'],
    ['speechiness', 'Spoken'],
  ]

  return (
    <div className="record-music-page">
      <PageHeading
        eyebrow="Listening record"
        title="Music"
        description="Your listening history, ranked and placed in time."
        meta={`${periodLabel} · ${profile?.streamTrackingEnabled ? 'Tracking on' : 'Tracking off'}`}
        actions={(
          <button className="btn primary" onClick={syncLatest} disabled={syncing || loading || !linked}>
            {syncing ? 'Syncing…' : 'Sync plays'}
          </button>
        )}
      />

      {error && <StatePanel kind="error" title="Music could not update" detail={error} />}

      {!linked && linked !== null ? (
        <StatePanel
          kind="empty"
          title="Connect Spotify to begin"
          detail={betaAccess?.enabled
            ? 'Spotify access is in beta. Connect an approved account from Settings → Connections.'
            : 'Connect your account from Settings → Connections to build a private listening record.'}
        />
      ) : (
        <>
          <section className="record-music-profile" aria-label="Spotify profile and current playback">
            <div className="record-music-profile__account">
              <div className="record-music-profile__avatar">
                {loading ? <LoadingDot /> : avatarUrl ? <img src={avatarUrl} alt="" /> : <Icon name="music" size={26} />}
              </div>
              <div className="record-music-profile__copy">
                <span>Connected source</span>
                <strong>{loading ? <LoadingLine width={120} /> : (profile?.displayName || 'Spotify')}</strong>
                <small>{loading ? <LoadingLine width={160} /> : (profile?.email || profile?.spotifyUserId || 'Awaiting account details')}</small>
              </div>
              <button className="btn subtle small" onClick={toggleTracking} disabled={loading}>
                {profile?.streamTrackingEnabled ? 'Pause tracking' : 'Resume tracking'}
              </button>
            </div>
            <div className="record-music-profile__playing">
              <CurrentlyPlayingBox loading={currentlyPlayingLoading} data={currentlyPlaying} />
            </div>
          </section>

          <section className="record-music-period" aria-label="Listening period">
            <div className="record-segmented" role="group" aria-label="Listening period">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  className={timeframe === tf.value ? 'is-active' : ''}
                  aria-pressed={timeframe === tf.value}
                  onClick={() => setTimeframe(tf.value)}
                >{tf.label}</button>
              ))}
            </div>
            {timeframe === 'custom' && (
              <div className="record-music-period__dates">
                <label>From<input type="date" className="input" value={customStart} onChange={e => setCustomStart(e.target.value)} /></label>
                <label>To<input type="date" className="input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></label>
              </div>
            )}
          </section>

          <SummaryStrip>
            <SummaryItem label="Plays" value={hasLoadedOnce ? formatNumberShort(stats?.totalStreams ?? 0) : '—'} />
            <SummaryItem label="Tracks" value={hasLoadedOnce ? formatNumberShort(stats?.uniqueTracks ?? 0) : '—'} />
            <SummaryItem label="Artists" value={hasLoadedOnce ? formatNumberShort(stats?.uniqueArtists ?? 0) : '—'} />
            <SummaryItem label="Listening time" value={hasLoadedOnce ? formatDuration(stats?.msListened ?? 0) : '—'} />
          </SummaryStrip>

          <section className="record-music-pattern" aria-labelledby="listening-pattern-title">
            <header className="record-section-heading">
              <div><span>Rhythm</span><h2 id="listening-pattern-title">Listening pattern</h2></div>
              <small>{periodLabel}</small>
            </header>
            <div className="record-music-pattern__grid">
              <div className="record-music-timeline" aria-label="Plays over time">
                {!hasLoadedOnce ? <LoadingDot /> : lineData ? (
                  <Line data={lineData} options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    maintainAspectRatio: false,
                    scales: {
                      x: { grid: { display: false }, ticks: { color: '#777781', maxTicksLimit: 7 } },
                      y: { grid: { color: 'rgba(255,255,255,.06)' }, ticks: { color: '#777781' }, min: 0 },
                    },
                  }} />
                ) : <StatePanel title="No plays in this period" detail="Listening activity will appear here after the next sync." />}
              </div>
              <div className="record-music-clock">
                <span>Listening clock</span>
                <div className="record-music-clock__chart">
                  {!hasLoadedOnce ? <LoadingDot /> : wheelData ? (
                    <PolarArea data={wheelData} options={{
                      responsive: true,
                      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } } },
                      maintainAspectRatio: false,
                      scales: { r: { grid: { color: 'rgba(255,255,255,.06)' }, ticks: { display: false }, angleLines: { color: 'rgba(255,255,255,.06)' } } },
                    }} />
                  ) : <small>No hourly data</small>}
                </div>
              </div>
              <div className="record-music-sound">
                <div className="record-music-sound__lead">
                  <span>Sound profile</span>
                  <strong>{moodData?.averages?.bpm ? `${moodData.averages.bpm} BPM` : 'Not enough data'}</strong>
                  <small>{moodData?.totalTracks ? `${moodData.totalTracks} analysed tracks · Audio traits supplied by ReccoBeats` : 'Sync plays to enrich your listening record with audio traits.'}</small>
                </div>
                {soundMeasures.map(([key, label]) => {
                  const value = Math.round((moodData?.averages?.[key] || 0) * 100)
                  return (
                    <div className="record-music-sound__row" key={key}>
                      <span>{label}</span><div><i style={{ width: `${value}%` }} /></div><em>{value}%</em>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="record-music-history">
            <header className="record-section-heading">
              <div><span>Chronology</span><h2>Recent plays</h2></div>
              <button className="btn subtle small" onClick={() => setShowHistoryModal(true)} disabled={!history.length}>View all</button>
            </header>
            {!hasLoadedOnce ? (
              <div className="record-loading-row"><LoadingLine width={220} /></div>
            ) : history.length ? (
              <ul>{history.slice(0, 5).map((item, index) => <HistoryItem key={item.id || index} stream={item} />)}</ul>
            ) : <StatePanel title="No recent plays" detail="Sync Spotify to bring the latest listening history into Record." />}
          </section>

          <section className="record-music-rankings" aria-labelledby="music-ranking-title">
            <header className="record-section-heading">
              <div><span>Ranking</span><h2 id="music-ranking-title">Most played</h2></div>
              <div className="record-segmented record-segmented--compact" role="group" aria-label="Ranking category">
                {['tracks', 'albums', 'artists', 'playlists'].map(cat => (
                  <button key={cat} className={topCategory === cat ? 'is-active' : ''} aria-pressed={topCategory === cat} onClick={() => setTopCategory(cat)}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </header>
            <div className="listening-ranking-list">
              {topItems.length ? topItems.map((item, index) => (
                <ListeningRankRow
                  key={item.trackId || item.albumId || item.artistId || item.playlistId}
                  data={item}
                  details={topDetails[index]}
                  rank={index + 1}
                  type={topCategory}
                />
              )) : <StatePanel title={`No ranked ${topCategory}`} detail={`Play data for ${periodLabel.toLowerCase()} will be ranked here.`} />}
            </div>
          </section>

          {showHistoryModal && <HistoryModal onClose={() => setShowHistoryModal(false)} />}
        </>
      )}
    </div>
  )
}
