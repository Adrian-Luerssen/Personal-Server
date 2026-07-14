import React, { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import PageHeading from '../../components/record/PageHeading'
import SummaryStrip, { SummaryItem } from '../../components/record/SummaryStrip'
import StatePanel from '../../components/record/StatePanel'
import { Register, RegisterRow } from '../../components/record/Register'
import { formatDuration, formatNumberShort } from '../../components/shared'

function itemIdentity(type, data, details) {
  if (type === 'tracks') return {
    id: data.trackId,
    title: details?.title || data.trackId || 'Unknown track',
    subtitle: details?.artists || 'Track',
  }
  if (type === 'albums') return {
    id: data.albumId,
    title: details?.title || data.albumId || 'Unknown album',
    subtitle: details?.artistName || 'Album',
  }
  return {
    id: data.artistId,
    title: details?.name || data.artistId || 'Unknown artist',
    subtitle: 'Artist',
  }
}

function RankingRegister({ details, items, loading, title, type }) {
  return (
    <Register title={title} description="Ranked by verified stream count">
      {loading ? (
        <StatePanel kind="loading" title={`Loading ${title.toLowerCase()}`} detail="Reading the shared listening index." />
      ) : items.length === 0 ? (
        <StatePanel title={`No ${title.toLowerCase()} yet`} detail="Rankings appear after listening records have been synced." />
      ) : items.map((item, index) => {
        const identity = itemIdentity(type, item, details[index])
        return (
          <RegisterRow
            key={identity.id || index}
            leading={String(index + 1).padStart(2, '0')}
            meta={`${formatNumberShort(Number(item.count) || 0)} plays`}
          >
            <strong>{identity.title}</strong>
            <small>{identity.subtitle}</small>
          </RegisterRow>
        )
      })}
    </Register>
  )
}

export default function SpotifyGlobal() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [globalStats, setGlobalStats] = useState(null)
  const [globalTopTracks, setGlobalTopTracks] = useState([])
  const [globalTopAlbums, setGlobalTopAlbums] = useState([])
  const [globalTopArtists, setGlobalTopArtists] = useState([])
  const [globalTopTrackDetails, setGlobalTopTrackDetails] = useState([])
  const [globalTopAlbumDetails, setGlobalTopAlbumDetails] = useState([])
  const [globalTopArtistDetails, setGlobalTopArtistDetails] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    Promise.all([
      apiFetch('/streams/global-stats', { signal: controller.signal }),
      apiFetch('/streams/global-top?platform=spotify&limit=10', { signal: controller.signal }),
      apiFetch('/albums/global-top-albums?platform=spotify&limit=10', { signal: controller.signal }),
      apiFetch('/artists/global-top-artists?platform=spotify&limit=10', { signal: controller.signal }),
    ]).then(async ([stats, tracks, albums, artists]) => {
      if (controller.signal.aborted) return
      setGlobalStats(stats)
      setGlobalTopTracks(tracks || [])
      setGlobalTopAlbums(albums || [])
      setGlobalTopArtists(artists || [])

      const [trackDetails, albumDetails, artistDetails] = await Promise.all([
        Promise.all((tracks || []).map(item => apiFetch(`/tracks/${item.trackId}`, { signal: controller.signal }).catch(() => null))),
        Promise.all((albums || []).map(item => apiFetch(`/albums/${item.albumId}`, { signal: controller.signal }).catch(() => null))),
        Promise.all((artists || []).map(item => apiFetch(`/artists/${item.artistId}`, { signal: controller.signal }).catch(() => null))),
      ])
      if (controller.signal.aborted) return
      setGlobalTopTrackDetails(trackDetails)
      setGlobalTopAlbumDetails(albumDetails)
      setGlobalTopArtistDetails(artistDetails)
    }).catch(err => {
      if (!controller.signal.aborted) setError(err.message || 'Could not load aggregated listening')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })

    return () => controller.abort()
  }, [])

  return (
    <div className="record-music-global">
      <PageHeading
        eyebrow="Music / Community"
        title="Aggregated listening"
        description="A shared, count-only view of listening activity across participating accounts."
        meta="No private playback history is shown here"
      />

      {error ? <StatePanel kind="error" title="Shared listening is unavailable" detail={error} /> : (
        <>
          <SummaryStrip>
            <SummaryItem label="Streams" value={loading ? '—' : formatNumberShort(globalStats?.totalStreams ?? 0)} />
            <SummaryItem label="Tracks" value={loading ? '—' : formatNumberShort(globalStats?.uniqueTracks ?? 0)} />
            <SummaryItem label="Artists" value={loading ? '—' : formatNumberShort(globalStats?.uniqueArtists ?? 0)} />
            <SummaryItem label="Listening time" value={loading ? '—' : formatDuration(globalStats?.msListened ?? 0)} />
          </SummaryStrip>

          <div className="record-music-global__registers">
            <RankingRegister title="Top tracks" type="tracks" loading={loading} items={globalTopTracks} details={globalTopTrackDetails} />
            <RankingRegister title="Top albums" type="albums" loading={loading} items={globalTopAlbums} details={globalTopAlbumDetails} />
            <RankingRegister title="Top artists" type="artists" loading={loading} items={globalTopArtists} details={globalTopArtistDetails} />
          </div>
        </>
      )}
    </div>
  )
}
