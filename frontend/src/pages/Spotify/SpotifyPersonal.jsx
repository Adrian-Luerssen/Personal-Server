import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
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
import { api, apiFetch } from '../../api'
import '../../custom-scrollbar.css'
import { LoadingDot, LoadingLine, HistoryModal, StatCard, formatDuration, formatNumberShort, PodiumCard } from './SpotifyShared'

// Register Chart.js components
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

const TIMEFRAMES = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
]

const mapTimeframe = (tf, from, to) => {
  if (tf === 'custom' && from && to) return { from, to }
  if (tf === 'today') return { timeframe: 'today' }
  if (tf === 'week') return { timeframe: '7d' }
  if (tf === 'month') return { timeframe: '30d' }
  if (tf === 'year') return { timeframe: '1y' }
  return { timeframe: 'all' }
}

export default function SpotifyPersonal() {
  const [profile, setProfile] = useState(null)
      // Avatar URL for personal stats card (must be after profile declaration)
      const avatarUrl = profile?.images?.[0]?.url
      const [currentlyPlaying, setCurrentlyPlaying] = useState(null)
      const [currentlyPlayingLoading, setCurrentlyPlayingLoading] = useState(true)
      const currentlyPlayingRef = useRef(null)
      const { sidebarCollapsed } = useOutletContext() || {}
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')
      const [linked, setLinked] = useState(null)
      const [syncing, setSyncing] = useState(false)
      const [topTracks, setTopTracks] = useState([])
      const [topAlbums, setTopAlbums] = useState([])
      const [topArtists, setTopArtists] = useState([])
      const [topTrackDetails, setTopTrackDetails] = useState([])
      const [topAlbumDetails, setTopAlbumDetails] = useState([])
      const [topArtistDetails, setTopArtistDetails] = useState([])
  const [topCategory, setTopCategory] = useState('tracks')
  
      const [stats, setStats] = useState(null)
      const [history, setHistory] = useState([])
      const [showHistoryModal, setShowHistoryModal] = useState(false)
      const [timeframe, setTimeframe] = useState('today')
      const [customStart, setCustomStart] = useState('')
      const [customEnd, setCustomEnd] = useState('')
      const [perDay, setPerDay] = useState([])
      const [perHour, setPerHour] = useState([])
  
      // Refs to always access current timeframe state in background sync
      const timeframeRef = useRef(timeframe)
      const customStartRef = useRef(customStart)
      const customEndRef = useRef(customEnd)
  
      useEffect(() => { timeframeRef.current = timeframe }, [timeframe])
      useEffect(() => { customStartRef.current = customStart }, [customStart])
      useEffect(() => { customEndRef.current = customEnd }, [customEnd])
  
      async function load() {
          setError('')
          setLoading(true)
          try {
              const linkStatus = await api.get('/spotify/linked')
              setLinked(!!linkStatus?.linked)
              if (!linkStatus?.linked) {
                  setProfile(null)
                  setTopTracks([])
                  setTopAlbums([])
                  setTopArtists([])
                  setStats(null)
                  setHistory([])
                  setPerDay([])
                  setPerHour([])
                  return
              }
              // Always use current timeframe state via refs
              const currentTimeframe = timeframeRef.current
              const currentStart = customStartRef.current
              const currentEnd = customEndRef.current
              let statsParams = ''
              if (currentTimeframe === 'custom' && currentStart && currentEnd) {
                  statsParams = `?start=${currentStart}&end=${currentEnd}`
              } else if (currentTimeframe !== 'all') {
                  statsParams = `?timeframe=${currentTimeframe}`
              }
              const [me, topTracksData, topAlbumsData, topArtistsData, statsData, historyData, perDayData, perHourData] = await Promise.all([
                  api.get('/spotify/me'),
                  api.get('/streams/top?platform=spotify&limit=10&type=track' + (statsParams ? '&' + statsParams.slice(1) : '')),
                  api.get('/albums/top-albums?platform=spotify&limit=10' + (statsParams ? '&' + statsParams.slice(1) : '')),
                  api.get('/artists/top-artists?platform=spotify&limit=10' + (statsParams ? '&' + statsParams.slice(1) : '')),
                  api.get('/streams/stats' + statsParams),
                  api.get('/streams/history?page=1&pageSize=10'),
                  api.get('/streams/per-day' + statsParams),
                  api.get('/streams/per-hour' + statsParams),
              ])
              setProfile(me)
              setTopTracks(topTracksData)
              setTopAlbums(topAlbumsData)
              setTopArtists(topArtistsData)
              setStats(statsData)
              setHistory(Array.isArray(historyData.items) ? historyData.items : historyData)
              setPerDay(perDayData)
              setPerHour(perHourData)
  
              // Preload details for all top items
              const [trackDetails, albumDetails, artistDetails] = await Promise.all([
                  Promise.all((topTracksData || []).map(t => api.get(`/tracks/${t.trackId}`))),
                  Promise.all((topAlbumsData || []).map(a => api.get(`/albums/${a.albumId}`))),
                  Promise.all((topArtistsData || []).map(a => api.get(`/artists/${a.artistId}`)))
              ])
              setTopTrackDetails(trackDetails)
              setTopAlbumDetails(albumDetails)
              setTopArtistDetails(artistDetails)
          } catch (e) {
              setError(e.message || 'Failed to load Spotify data')
          } finally {
              setLoading(false)
          }
      }
  
      useEffect(() => { load() }, [timeframe, customStart, customEnd])
  
      // Map UI timeframe to backend query
      const mapTimeframe = (tf, from, to) => {
          if (tf === 'custom' && from && to) return { from, to }
          if (tf === 'today') return { timeframe: 'today' }
          if (tf === 'week') return { timeframe: '7d' }
          if (tf === 'month') return { timeframe: '30d' }
          if (tf === 'year') return { timeframe: '1y' }
          return { timeframe: 'all' }
      }
  
      useEffect(() => {
          if (!linked && linked !== null) {
              setMainTab('global')
              const ctrl = new AbortController()
              loadGlobal(ctrl.signal)
              return () => ctrl.abort()
          }
      }, [linked])
  
      // Initial bootstrap: fetch linked + profile without blocking UI
      useEffect(() => {
          let mounted = true
          const ctrl = new AbortController()
          Promise.all([
              apiFetch('/spotify/linked', { signal: ctrl.signal }).catch(() => ({ linked: false })),
              apiFetch('/spotify/me', { signal: ctrl.signal }).catch(() => null)
          ]).then(([l, me]) => {
              if (!mounted || ctrl.signal.aborted) return
              setLinked(!!l?.linked)
              if (me) setProfile(me)
              setLoading(false)
          })
          return () => { mounted = false; ctrl.abort() }
      }, [])
  
      // Personal stats loader (background, abortable)
      useEffect(() => {
          if (linked === false) return
          const ctrl = new AbortController()
          const { timeframe: tf, from, to } = mapTimeframe(timeframe, customStart, customEnd)
          const qs = new URLSearchParams()
          if (tf) qs.set('timeframe', tf)
          if (from) qs.set('from', from)
          if (to) qs.set('to', to)
          const q = qs.toString() ? `?${qs}` : ''
          const pStats = apiFetch(`/streams/stats${q}`, { signal: ctrl.signal }).catch(() => null)
          const pPerDay = apiFetch(`/streams/per-day${q}`, { signal: ctrl.signal }).catch(() => [])
          const pPerHour = apiFetch(`/streams/per-hour${q}`, { signal: ctrl.signal }).catch(() => [])
          Promise.all([pStats, pPerDay, pPerHour]).then(([s, d, h]) => {
              if (ctrl.signal.aborted) return
              if (s) setStats(s)
              setPerDay(Array.isArray(d) ? d : [])
              setPerHour(Array.isArray(h) ? h : [])
          })
          return () => ctrl.abort()
      }, [linked, timeframe, customStart, customEnd])
  
      // Personal top items loader (background, abortable)
      useEffect(() => {
          if (linked === false) return
          const ctrl = new AbortController()
          const { timeframe: tf, from, to } = mapTimeframe(timeframe, customStart, customEnd)
          const qs = new URLSearchParams({ platform: 'spotify', limit: '10' })
          if (tf) qs.set('timeframe', tf)
          if (from) qs.set('from', from)
          if (to) qs.set('to', to)
          const q = `?${qs}`
          const pTracks = apiFetch(`/streams/top${q}`, { signal: ctrl.signal }).catch(() => [])
          const pAlbums = apiFetch(`/albums/top-albums${q}`, { signal: ctrl.signal }).catch(() => [])
          const pArtists = apiFetch(`/artists/top-artists${q}`, { signal: ctrl.signal }).catch(() => [])
          Promise.all([pTracks, pAlbums, pArtists]).then(([tracks, albums, artists]) => {
              if (ctrl.signal.aborted) return
              setTopTracks(tracks)
              setTopAlbums(albums)
              setTopArtists(artists)
              // details prefetch
              Promise.all([
                  Promise.all((tracks || []).map(t => apiFetch(`/tracks/${t.trackId}`, { signal: ctrl.signal }).catch(() => null))),
                  Promise.all((albums || []).map(a => apiFetch(`/albums/${a.albumId}`, { signal: ctrl.signal }).catch(() => null))),
                  Promise.all((artists || []).map(a => apiFetch(`/artists/${a.artistId}`, { signal: ctrl.signal }).catch(() => null))),
              ]).then(([td, ad, ard]) => {
                  if (ctrl.signal.aborted) return
                  setTopTrackDetails(td)
                  setTopAlbumDetails(ad)
                  setTopArtistDetails(ard)
              }).catch(() => {})
          })
          return () => ctrl.abort()
      }, [linked, timeframe, customStart, customEnd])
  
      useEffect(() => {
          let mounted = true
          async function fetchCurrent() {
              try {
                  setCurrentlyPlayingLoading(true)
                  const data = await api.get('/spotify/currently-playing')
                  if (mounted) setCurrentlyPlaying(data)
              } finally {
                  if (mounted) setCurrentlyPlayingLoading(false)
              }
          }
          fetchCurrent()
          const interval = setInterval(fetchCurrent, 20000)
          return () => { mounted = false; clearInterval(interval) }
      }, [])
  
  
  
  useEffect(() => {
          let stopped = false;
          async function backgroundSync() {
              while (!stopped) {
                  await new Promise(res => setTimeout(res, 120000)); // 2 minutes
                  if (stopped) break;
                  try {
                      await api.post('/spotify/sync-streams');
                      await load();
                  } catch (e) {
                      // Ignore background errors
                  }
              }
          }
          backgroundSync();
          return () => { stopped = true; };
      }, []);
  
      
  
      // Chart data for streams per day
      const lineData = useMemo(() => {
          if (!perDay || perDay.length === 0) return null
          return {
              labels: perDay.map(d => d.date),
              datasets: [
                  {
                      label: 'Streams per Day',
                      data: perDay.map(d => d.count),
                      fill: false,
                      borderColor: '#7dd3fc',
                      backgroundColor: 'rgba(125,211,252,0.2)',
                      tension: 0.3,
                  }
              ]
          }
      }, [perDay])
  
  
  const wheelData = useMemo(() => {
  if (!perHour || perHour.length === 0) return null
          // Ensure 24 segments for 24 hours
          const hours = Array.from({ length: 24 }, (_, i) => i)
          const hourCounts = hours.map(h => {
              const found = perHour.find(d => Number(d.hour) === h)
              return found ? found.count : 0
          })
          return {
              labels: hours.map(h => `${h}:00`),
              datasets: [
                  {
                      label: 'Streams per Hour',
                      data: hourCounts,
                      backgroundColor: hours.map((_, i) => `hsl(${i * 15}, 80%, 60%)`),
                      borderWidth: 1,
                  }
              ]
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
              // Kick off background refreshes without blocking button
              const ctrl = new AbortController()
              loadGlobal(ctrl.signal)
          } catch (e) {
              setError(e.message || 'Sync failed')
          } finally {
              setSyncing(false)
          }
      }
  
      // Currently playing polling (non-blocking)
      useEffect(() => {
          let mounted = true
          let intervalId
          const fetchNow = (signal) => {
              setCurrentlyPlayingLoading(true)
              apiFetch('/spotify/currently-playing', { signal })
                  .then((d) => { if (mounted && !signal.aborted) setCurrentlyPlaying(d) })
                  .catch(() => {})
                  .finally(() => { if (mounted && !signal.aborted) setCurrentlyPlayingLoading(false) })
          }
          const ctrl = new AbortController()
          fetchNow(ctrl.signal)
          intervalId = setInterval(() => {
              const c = new AbortController()
              fetchNow(c.signal)
          }, 10000)
          return () => { mounted = false; ctrl.abort(); if (intervalId) clearInterval(intervalId) }
      }, [])
  
      // Background periodic refresh (every 2 minutes)
      useEffect(() => {
          const id = setInterval(() => {
              const ctrl = new AbortController()
              // refresh personal stats and tops using latest timeframe
              const tf = timeframeRef.current
              const cs = customStartRef.current
              const ce = customEndRef.current
              const { timeframe: t, from, to } = mapTimeframe(tf, cs, ce)
              const qs = new URLSearchParams({ platform: 'spotify', limit: '10' })
              if (t) qs.set('timeframe', t)
              if (from) qs.set('from', from)
              if (to) qs.set('to', to)
              const q = `?${qs}`
              // fire-and-forget
              apiFetch('/streams/stats' + (t || from || to ? `?${new URLSearchParams({ ...(t ? { timeframe: t } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) })}` : ''), { signal: ctrl.signal }).then(s => setStats(s)).catch(() => {})
              apiFetch('/streams/per-day' + (t || from || to ? `?${new URLSearchParams({ ...(t ? { timeframe: t } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) })}` : ''), { signal: ctrl.signal }).then(d => setPerDay(Array.isArray(d) ? d : [])).catch(() => {})
              apiFetch('/streams/per-hour' + (t || from || to ? `?${new URLSearchParams({ ...(t ? { timeframe: t } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) })}` : ''), { signal: ctrl.signal }).then(h => setPerHour(Array.isArray(h) ? h : [])).catch(() => {})
              apiFetch('/streams/top' + q, { signal: ctrl.signal }).then(tracks => setTopTracks(tracks || [])).catch(() => {})
              apiFetch('/albums/top-albums' + q, { signal: ctrl.signal }).then(albums => setTopAlbums(albums || [])).catch(() => {})
              apiFetch('/artists/top-artists' + q, { signal: ctrl.signal }).then(artists => setTopArtists(artists || [])).catch(() => {})
          }, 120000)
          return () => clearInterval(id)
      }, [])
  
  return (
          <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
              <h1>Spotify - Personal</h1>
              
                  <React.Fragment>
                      {/* Top row: Currently playing + Profile side by side */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', alignItems: 'stretch', marginBottom: '4rem' }}>
                          <div>
                              <CurrentlyPlayingBox loading={currentlyPlayingLoading} data={currentlyPlaying} />
                          </div>
                          <div>
                              <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', height: '100%' }}>
                                  {loading ? (
                                      <div style={{ width: 64, height: 64, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center' }}><LoadingDot /></div>
                                  ) : avatarUrl ? (
                                      <img src={avatarUrl} alt="avatar" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                                  ) : (
                                      <div style={{ width: 64, height: 64, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center' }}>🎵</div>
                                  )}
                                  <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{loading ? <LoadingLine width={120} /> : (profile?.displayName || 'Spotify Account')}</div>
                                      <div style={{ opacity: .8 }}>{loading ? <LoadingLine width={160} /> : (profile?.email || profile?.spotifyUserId || 'Not linked yet')}</div>
                                      <div style={{ marginTop: '.5rem', display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                          <button className="btn small" onClick={toggleTracking} disabled={loading}>
                                              {profile?.streamTrackingEnabled ? 'Disable tracking' : 'Enable tracking'}
                                          </button>
                                          <button className="btn small" onClick={syncLatest} disabled={syncing || loading}>
                                              {syncing ? 'Syncing…' : 'Sync latest plays'}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      {error && <div className="card" style={{ borderColor: 'rgba(255,0,0,0.2)' }}>{error}</div>}
                      {!linked && linked !== null ? (
                          <div className="card">Your account is not linked to Spotify.<br />Please link your Spotify account in your account settings or contact an administrator.</div>
                      ) : null}
                      {(linked || linked === null) && (
                          <React.Fragment>
                              <div className="card" style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span>Timeframe:</span>
                          {TIMEFRAMES.map(tf => (
                              <button
                                  key={tf.value}
                                  className={"btn small" + (timeframe === tf.value ? ' active' : '')}
                                  style={{
                                      fontWeight: timeframe === tf.value ? 700 : 400,
                                      background: timeframe === tf.value ? '#7dd3fc' : 'rgba(125,211,252,0.1)',
                                      color: timeframe === tf.value ? '#0a1929' : 'rgba(125,211,252,0.7)',
                                      border: timeframe === tf.value ? '2px solid #7dd3fc' : '1px solid rgba(125,211,252,0.2)'
                                  }}
                                  onClick={() => setTimeframe(tf.value)}
                              >{tf.label}</button>
                          ))}
                          {timeframe === 'custom' && (
                              <React.Fragment>
                                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                                  <span>to</span>
                                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                              </React.Fragment>
                          )}
                      </div>
  
                      <div className="card" style={{ marginBottom: '1rem', background: 'none', boxShadow: 'none', border: 'none', padding: 0 }}>
                          <h3 style={{ marginBottom: '1rem' }}>General Statistics</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                              <StatCard label="Total Streams" value={loading ? <LoadingLine width={80} /> : formatNumberShort(stats?.totalStreams ?? 0)} />
                              <StatCard label="Unique Tracks" value={loading ? <LoadingLine width={80} /> : formatNumberShort(stats?.uniqueTracks ?? 0)} />
                              <StatCard label="Unique Artists" value={loading ? <LoadingLine width={80} /> : formatNumberShort(stats?.uniqueArtists ?? 0)} />
                              <StatCard label="Total Minutes Listened" value={loading ? <LoadingLine width={80} /> : formatNumberShort(Math.floor((stats?.msListened ?? 0) / 1000 / 60))} />
                              <StatCard label="Total Time Listened" value={loading ? <LoadingLine width={80} /> : formatDuration(stats?.msListened ?? 0)} />
                          </div>
                          {/* Top row: day line chart full width */}
                          <div style={{ marginTop: '1rem', height: 240, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }}>
                              {loading ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                      <LoadingDot />
                                      <div style={{ color: '#7dd3fc', opacity: 0.5, fontSize: 14 }}>Loading chart data...</div>
                                  </div>
                              ) : lineData ? (
                                  <div style={{ width: '100%', height: '100%' }}>
                                      <Line data={lineData} options={{
                                          responsive: true,
                                          plugins: { legend: { display: false } },
                                          maintainAspectRatio: false,
                                          scales: {
                                              x: { grid: { color: '#222' } },
                                              y: { grid: { color: '#222' }, min: 0 }
                                          }
                                      }} style={{ width: '100%', height: '100%' }} />
                                  </div>
                              ) : (
                                  <div style={{ color: '#7dd3fc', opacity: 0.5, fontSize: 18, textAlign: 'center' }}>No stream data for graph.</div>
                              )}
                          </div>
                          {/* Bottom row: radial clock and placeholder side by side */}
                          <div style={{ marginTop: '2rem', width: '100%', display: 'flex', gap: '2rem', alignItems: 'stretch' }}>
                              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                  <div style={{ fontWeight: 700, fontSize: 18, color: '#7dd3fc', marginBottom: 8, textAlign: 'center' }}>Listening Clock</div>
                                  <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxWidth: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 32px 32px 32px', boxSizing: 'border-box' }}>
                                      {loading ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                              <LoadingDot />
                                              <div style={{ color: '#7dd3fc', opacity: 0.5, fontSize: 14 }}>Loading...</div>
                                          </div>
                                      ) : wheelData ? (
                                          <>
                                              <PolarArea data={wheelData} options={{
                                                  responsive: true,
                                                  plugins: {
                                                      legend: { display: false },
                                                      tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
                                                  },
                                                  maintainAspectRatio: false,
                                                  scales: {
                                                      r: {
                                                          grid: { display: true, color: 'rgba(125,211,252,0.13)' },
                                                          pointLabels: { color: 'rgba(125,211,252,0.7)', font: { size: 13, weight: 'bold' } },
                                                          ticks: { display: false },
                                                          angleLines: { color: '#222' }
                                                      }
                                                  }
                                              }} style={{ width: '100%', height: '100%' }} />
                                              {/* Cardinal time labels overlay */}
                                              <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', color: 'rgba(125,211,252,0.7)', fontWeight: 600, fontSize: 15 }}>00</div>
                                              <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(125,211,252,0.7)', fontWeight: 600, fontSize: 15 }}>06</div>
                                              <div style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', color: 'rgba(125,211,252,0.7)', fontWeight: 600, fontSize: 15 }}>12</div>
                                              <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(125,211,252,0.7)', fontWeight: 600, fontSize: 15 }}>18</div>
                                          </>
                                      ) : (
                                          <div style={{ color: '#7dd3fc', opacity: 0.5, fontSize: 18, textAlign: 'center' }}>No hourly data for chart.</div>
                                      )}
                                  </div>
                              </div>
                              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                  {/* Placeholder for future chart */}
                                  <div style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7dd3fc', opacity: 0.3, fontSize: 22, border: '2px dashed #7dd3fc', borderRadius: 12 }}>
                                      Chart placeholder
                                  </div>
                              </div>
                          </div>
                      </div>
  
                      <div className="card" style={{ marginBottom: '1rem' }}>
                          <h3>Recent Streaming History</h3>
                          <div style={{ maxHeight: 120, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#7dd3fc #222' }} className="custom-scrollbar">
                              {loading ? (
                                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                      {Array.from({ length: 5 }).map((_, i) => (
                                          <li key={i} style={{ padding: '.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                                              <div style={{ width: 44, height: 44, borderRadius: 6, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}></div>
                                              <div style={{ flex: 1 }}>
                                                  <LoadingLine width={220} />
                                                  <LoadingLine width={150} />
                                              </div>
                                          </li>
                                      ))}
                                  </ul>
                              ) : history && history.length ? (
                                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                      {history.map((h, i) => (
                                          <HistoryItem key={h.id || i} stream={h} />
                                      ))}
                                  </ul>
                              ) : <div>No recent streams.</div>}
                          </div>
                          <button className="btn small" style={{ marginTop: '0.5rem' }} onClick={() => setShowHistoryModal(true)}>Show all recent streams</button>
                      </div>
  
                      {showHistoryModal && <HistoryModal onClose={() => setShowHistoryModal(false)} />}
  
                      <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(125,211,252,0.2)', paddingBottom: '0.5rem' }}>
                              <button
                                  className="btn small"
                                  style={{
                                      background:  topCategory === 'tracks' ? '#7dd3fc' : 'rgba(125,211,252,0.1)',
                                      color:  topCategory === 'tracks' ? '#0a1929' : 'rgba(125,211,252,0.7)',
                                      border:  topCategory === 'tracks' ? '2px solid #7dd3fc' : '1px solid rgba(125,211,252,0.2)',
                                      fontWeight:  topCategory === 'tracks' ? 700 : 400
                                  }}
                                  onClick={() => { setTopCategory('tracks'); }}
                              >Top Tracks</button>
                              <button
                                  className="btn small"
                                  style={{
                                      background: topCategory === 'albums' ? '#7dd3fc' : 'rgba(125,211,252,0.1)',
                                      color: topCategory === 'albums' ? '#0a1929' : 'rgba(125,211,252,0.7)',
                                      border:  topCategory === 'albums' ? '2px solid #7dd3fc' : '1px solid rgba(125,211,252,0.2)',
                                      fontWeight: topCategory === 'albums' ? 700 : 400
                                  }}
                                  onClick={() => { setTopCategory('albums'); }}
                              >Top Albums</button>
                              <button
                                  className="btn small"
                                  style={{
                                      background:  topCategory === 'artists' ? '#7dd3fc' : 'rgba(125,211,252,0.1)',
                                      color:  topCategory === 'artists' ? '#0a1929' : 'rgba(125,211,252,0.7)',
                                      border:  topCategory === 'artists' ? '2px solid #7dd3fc' : '1px solid rgba(125,211,252,0.2)',
                                      fontWeight: topCategory === 'artists' ? 700 : 400
                                  }}
                                  onClick={() => { setTopCategory('artists'); }}
                              >Top Artists</button>
                          </div>
  
                          
                              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                                  {(topCategory === 'tracks' ? topTracks : topCategory === 'albums' ? topAlbums : topCategory === 'artists' ? topArtists : []).length === 0 ? (
                                      <div className="card">No top {topCategory} yet.</div>
                                  ) : (topCategory === 'tracks' ? topTracks : topCategory === 'albums' ? topAlbums : topArtists).map((item, idx) => (
                                      <PodiumCard
                                          key={item.trackId || item.albumId || item.artistId}
                                          data={item}
                                          details={topCategory === 'tracks' ? topTrackDetails[idx] : topCategory === 'albums' ? topAlbumDetails[idx] : topArtistDetails[idx]}
                                          rank={idx + 1}
                                          type={topCategory}
                                      />
                                  ))}
                              </div>
                          
                      </div>
                          </React.Fragment>
                      )}
                  </React.Fragment>
          </div>
      )
}
  


// Update HistoryItem to always fetch and display images asynchronously
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


function TrackCard({ data }) {
    const [details, setDetails] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        let mounted = true
        api.get(`/tracks/${data.trackId}`)
            .then((d) => { if (mounted) setDetails(d) })
            .catch((e) => setError(e.message || 'Failed to load track'))
        return () => { mounted = false }
    }, [data.trackId])

    const img = details?.images?.[0]?.url || details?.album?.images?.[0]?.url
    const title = details?.title || data.trackId
    const artists = details?.artists || ""

    return (
        <div className="card" style={{ display: 'flex', gap: '.75rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                {img ? <img alt="cover" src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>🎧</div>}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{title}</div>
                <div style={{ opacity: .8, fontSize: '.95rem' }}>{artists || 'Unknown artist'}</div>
                <div style={{ marginTop: '.5rem', opacity: .9 }}>
                    Plays on Spotify: <b>{formatNumberShort(Number(data.count) || 0)}</b>
                </div>
            </div>
        </div>
    )
}

