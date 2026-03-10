import React, { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import {
  StatCard,
  PodiumCard,
  AnimatedNumber,
  LoadingLine,
  SkeletonStatCard,
  formatNumberShort,
  formatDuration,
} from '../../components/shared'

export default function SpotifyGlobal() {
  const [loading, setLoading] = useState(true)
  const [globalStats, setGlobalStats] = useState(null)
  const [globalTopTracks, setGlobalTopTracks] = useState([])
  const [globalTopAlbums, setGlobalTopAlbums] = useState([])
  const [globalTopArtists, setGlobalTopArtists] = useState([])
  const [globalTopTrackDetails, setGlobalTopTrackDetails] = useState([])
  const [globalTopAlbumDetails, setGlobalTopAlbumDetails] = useState([])
  const [globalTopArtistDetails, setGlobalTopArtistDetails] = useState([])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)

    const p1 = apiFetch('/streams/global-stats', { signal: ctrl.signal }).catch(() => null)
    const p2 = apiFetch('/streams/global-top?platform=spotify&limit=10', { signal: ctrl.signal }).catch(() => [])
    const p3 = apiFetch('/albums/global-top-albums?platform=spotify&limit=10', { signal: ctrl.signal }).catch(() => [])
    const p4 = apiFetch('/artists/global-top-artists?platform=spotify&limit=10', { signal: ctrl.signal }).catch(() => [])

    Promise.all([p1, p2, p3, p4]).then(async ([statsData, topTracksData, topAlbumsData, topArtistsData]) => {
      if (ctrl.signal.aborted) return
      setGlobalStats(statsData)
      setGlobalTopTracks(topTracksData)
      setGlobalTopAlbums(topAlbumsData)
      setGlobalTopArtists(topArtistsData)
      setLoading(false)

      Promise.all([
        Promise.all((topTracksData || []).map(t => apiFetch(`/tracks/${t.trackId}`, { signal: ctrl.signal }).catch(() => null))),
        Promise.all((topAlbumsData || []).map(a => apiFetch(`/albums/${a.albumId}`, { signal: ctrl.signal }).catch(() => null))),
        Promise.all((topArtistsData || []).map(a => apiFetch(`/artists/${a.artistId}`, { signal: ctrl.signal }).catch(() => null))),
      ]).then(([td, ad, ard]) => {
        if (ctrl.signal.aborted) return
        setGlobalTopTrackDetails(td)
        setGlobalTopAlbumDetails(ad)
        setGlobalTopArtistDetails(ard)
      }).catch(() => {})
    }).catch(() => setLoading(false))

    return () => ctrl.abort()
  }, [])

  return (
    <>
      <h2>Spotify — Global</h2>

      <div className="section">
        <h3>Global Spotify Statistics</h3>
        <div className="stat-grid">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard icon="play-circle" accentColor="var(--color-accent)" label="Total Streams" value={<AnimatedNumber value={globalStats?.totalStreams ?? 0} formatter={formatNumberShort} />} />
              <StatCard icon="disc" accentColor="var(--color-accent)" label="Unique Tracks" value={<AnimatedNumber value={globalStats?.uniqueTracks ?? 0} formatter={formatNumberShort} />} />
              <StatCard icon="mic" accentColor="var(--color-accent)" label="Unique Artists" value={<AnimatedNumber value={globalStats?.uniqueArtists ?? 0} formatter={formatNumberShort} />} />
              <StatCard icon="clock" accentColor="var(--color-accent)" label="Total Minutes" value={<AnimatedNumber value={Math.floor((globalStats?.msListened ?? 0) / 1000 / 60)} formatter={formatNumberShort} />} />
              <StatCard icon="timer" accentColor="var(--color-accent)" label="Total Time" value={<AnimatedNumber value={globalStats?.msListened ?? 0} formatter={formatDuration} />} />
            </>
          )}
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div style={{ gridColumn: '1/-1' }}><h3 style={{ color: 'var(--color-accent)' }}>Top Tracks (All Users)</h3></div>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: '.75rem' }}><LoadingLine width="60%" /><LoadingLine width="40%" /></div>
            ))
          ) : globalTopTracks.length === 0 ? (
            <div className="empty-state">No top tracks yet.</div>
          ) : globalTopTracks.map((item, idx) => (
            <PodiumCard key={item.trackId} data={item} details={globalTopTrackDetails[idx]} rank={idx + 1} type="tracks" />
          ))}

          <div style={{ gridColumn: '1/-1', marginTop: '1rem' }}><h3 style={{ color: 'var(--color-accent)' }}>Top Albums (All Users)</h3></div>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: '.75rem' }}><LoadingLine width="60%" /><LoadingLine width="40%" /></div>
            ))
          ) : globalTopAlbums.length === 0 ? (
            <div className="empty-state">No top albums yet.</div>
          ) : globalTopAlbums.map((item, idx) => (
            <PodiumCard key={item.albumId} data={item} details={globalTopAlbumDetails[idx]} rank={idx + 1} type="albums" />
          ))}

          <div style={{ gridColumn: '1/-1', marginTop: '1rem' }}><h3 style={{ color: 'var(--color-accent)' }}>Top Artists (All Users)</h3></div>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: '.75rem' }}><LoadingLine width="60%" /><LoadingLine width="40%" /></div>
            ))
          ) : globalTopArtists.length === 0 ? (
            <div className="empty-state">No top artists yet.</div>
          ) : globalTopArtists.map((item, idx) => (
            <PodiumCard key={item.artistId} data={item} details={globalTopArtistDetails[idx]} rank={idx + 1} type="artists" />
          ))}
        </div>
      </div>
    </>
  )
}
