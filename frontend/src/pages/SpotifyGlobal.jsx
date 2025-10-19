import React, { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { apiFetch } from '../api'
import { StatCard, PodiumCard, formatNumberShort, formatDuration } from './SpotifyShared'

export default function SpotifyGlobal() {
  const { sidebarCollapsed } = useOutletContext() || {}
  const [globalStats, setGlobalStats] = useState(null)
  const [globalTopTracks, setGlobalTopTracks] = useState([])
  const [globalTopAlbums, setGlobalTopAlbums] = useState([])
  const [globalTopArtists, setGlobalTopArtists] = useState([])
  const [globalTopTrackDetails, setGlobalTopTrackDetails] = useState([])
  const [globalTopAlbumDetails, setGlobalTopAlbumDetails] = useState([])
  const [globalTopArtistDetails, setGlobalTopArtistDetails] = useState([])

  function loadGlobal(signal) {
    const p1 = apiFetch('/streams/global-stats', { signal }).catch(() => null)
    const p2 = apiFetch('/streams/global-top?platform=spotify&limit=10', { signal }).catch(() => [])
    const p3 = apiFetch('/albums/global-top-albums?platform=spotify&limit=10', { signal }).catch(() => [])
    const p4 = apiFetch('/artists/global-top-artists?platform=spotify&limit=10', { signal }).catch(() => [])
    Promise.all([p1, p2, p3, p4]).then(async ([statsData, topTracksData, topAlbumsData, topArtistsData]) => {
      if (signal?.aborted) return
      setGlobalStats(statsData)
      setGlobalTopTracks(topTracksData)
      setGlobalTopAlbums(topAlbumsData)
      setGlobalTopArtists(topArtistsData)
      Promise.all([
        Promise.all((topTracksData || []).map(t => apiFetch(`/tracks/${t.trackId}`, { signal }).catch(() => null))),
        Promise.all((topAlbumsData || []).map(a => apiFetch(`/albums/${a.albumId}`, { signal }).catch(() => null))),
        Promise.all((topArtistsData || []).map(a => apiFetch(`/artists/${a.artistId}`, { signal }).catch(() => null))),
      ]).then(([td, ad, ard]) => {
        if (signal?.aborted) return
        setGlobalTopTrackDetails(td)
        setGlobalTopAlbumDetails(ad)
        setGlobalTopArtistDetails(ard)
      }).catch(() => {})
    }).catch(() => {})
  }

  useEffect(() => {
    const ctrl = new AbortController()
    loadGlobal(ctrl.signal)
    return () => ctrl.abort()
  }, [])

  return (
    <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
      <h1>Spotify — Global</h1>
      <h3 style={{ marginBottom: '1rem' }}>Global Spotify Statistics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        <StatCard label="Total Streams" value={formatNumberShort(globalStats?.totalStreams ?? 0)} />
        <StatCard label="Unique Tracks" value={formatNumberShort(globalStats?.uniqueTracks ?? 0)} />
        <StatCard label="Unique Artists" value={formatNumberShort(globalStats?.uniqueArtists ?? 0)} />
        <StatCard label="Total Minutes Listened" value={formatNumberShort(Math.floor((globalStats?.msListened ?? 0) / 1000 / 60))} />
        <StatCard label="Total Time Listened" value={formatDuration(globalStats?.msListened ?? 0)} />
      </div>
      <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div style={{ gridColumn: '1/-1', fontWeight: 700, fontSize: 18, color: '#7dd3fc', marginBottom: 8 }}>Top Tracks (All Users)</div>
        {globalTopTracks.length === 0 ? <div className="card">No top tracks yet.</div> : globalTopTracks.map((item, idx) => (
          <PodiumCard key={item.trackId} data={item} details={globalTopTrackDetails[idx]} rank={idx + 1} type="tracks" />
        ))}

        <div style={{ gridColumn: '1/-1', fontWeight: 700, fontSize: 18, color: '#7dd3fc', margin: '2rem 0 8px 0' }}>Top Albums (All Users)</div>
        {globalTopAlbums.length === 0 ? <div className="card">No top albums yet.</div> : globalTopAlbums.map((item, idx) => (
          <PodiumCard key={item.albumId} data={item} details={globalTopAlbumDetails[idx]} rank={idx + 1} type="albums" />
        ))}

        <div style={{ gridColumn: '1/-1', fontWeight: 700, fontSize: 18, color: '#7dd3fc', margin: '2rem 0 8px 0' }}>Top Artists (All Users)</div>
        {globalTopArtists.length === 0 ? <div className="card">No top artists yet.</div> : globalTopArtists.map((item, idx) => (
          <PodiumCard key={item.artistId} data={item} details={globalTopArtistDetails[idx]} rank={idx + 1} type="artists" />
        ))}
      </div>
    </div>
  )
}
