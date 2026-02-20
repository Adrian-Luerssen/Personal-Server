import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiBase } from '../config'
import { useOutletContext } from 'react-router-dom'
import { apiFetch } from '../api'
import { AnimatedNumber, LoadingLine, StatCard, formatDuration, formatNumberShort } from './Spotify/SpotifyShared'

export default function Home() {
  const { sidebarCollapsed } = useOutletContext() || {}
  const nav = useNavigate()
  const [status, setStatus] = useState('Checking session...')
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const hasLoadedOnceRef = useRef(false)
  useEffect(() => { hasLoadedOnceRef.current = hasLoadedOnce }, [hasLoadedOnce])

  // Spotify all-time
  const [spotifyStats, setSpotifyStats] = useState(null)
  // Workout all-time
  const [workoutTotals, setWorkoutTotals] = useState(null)
  // Music during workouts
  const [workoutStreamStats, setWorkoutStreamStats] = useState(null)

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    async function check() {
      try {
        if (accessToken && refreshToken) {
          const res = await fetch(getApiBase() + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          })
          if (!res.ok) throw new Error('refresh failed')
          const data = await res.json()
          if (data?.accessToken) localStorage.setItem('accessToken', data.accessToken)
          if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
          setStatus('Authenticated. Welcome!')
        } else {
          nav('/login', { replace: true })
        }
      } catch (e) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        nav('/login', { replace: true })
      }
    }

    check()
  }, [nav])

  // Load dashboard summary (all-time)
  useEffect(() => {
    const ctrl = new AbortController()
    async function load() {
      try {
        const [sp, wk, wms] = await Promise.all([
          apiFetch('/streams/stats?timeframe=all', { signal: ctrl.signal }).catch(() => null),
          apiFetch('/workout/sessions?page=1&limit=1', { signal: ctrl.signal }).catch(() => null),
          apiFetch('/dashboard/streams/workout', { signal: ctrl.signal }).catch(() => null),
        ])
        if (!ctrl.signal.aborted) {
          if (sp) setSpotifyStats(sp)
          if (wk) setWorkoutTotals({
            totalWorkouts: wk.totalWorkouts ?? (Array.isArray(wk.sessions) ? wk.sessions.length : 0),
            totalVolume: wk.totalVolume ?? 0,
            totalSets: wk.totalSets ?? 0,
            totalReps: wk.totalReps ?? 0,
            totalTimeSeconds: wk.totalTimeSeconds ?? 0,
          })
          if (wms) setWorkoutStreamStats(wms)
          if (!hasLoadedOnceRef.current) { setHasLoadedOnce(true); hasLoadedOnceRef.current = true }
        }
      } catch {
        // ignore for home summary
      }
    }
    load()
    return () => ctrl.abort()
  }, [])

  return (
    <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
      <h2>Home</h2>
      <p>{status}</p>

      {/* Spotify Summary */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Spotify</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <StatCard label="Total Streams" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={spotifyStats?.totalStreams ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Unique Tracks" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={spotifyStats?.uniqueTracks ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Unique Artists" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={spotifyStats?.uniqueArtists ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Total Minutes Listened" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={Math.floor((spotifyStats?.msListened ?? 0) / 1000 / 60)} formatter={formatNumberShort} />} />
          <StatCard label="Total Time Listened" value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={spotifyStats?.msListened ?? 0} formatter={formatDuration} />} />
        </div>
      </div>

      {/* Workout Summary */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Workout</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <StatCard label="Total Workouts" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalWorkouts ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Total Volume" value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={workoutTotals?.totalVolume ?? 0} formatter={(n)=> `${formatNumberShort(n)} kg`} />} />
          <StatCard label="Total Sets" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalSets ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Total Reps" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalReps ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Total Time" value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={(workoutTotals?.totalTimeSeconds ?? 0) * 1000} formatter={formatDuration} />} />
        </div>
      </div>

      {/* Room for expansion */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Music During Workouts</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <StatCard
            label="Streams During Workouts"
            value={!hasLoadedOnce ? (
              <LoadingLine width={160} />
            ) : (
              <AnimatedNumber value={workoutStreamStats?.streams ?? 0} formatter={formatNumberShort} />
            )}
          />
          <StatCard
            label="Time Streamed During Workouts"
            value={!hasLoadedOnce ? (
              <LoadingLine width={200} />
            ) : (
              <AnimatedNumber value={(workoutStreamStats?.totalTimeSeconds ?? 0) * 1000} formatter={formatDuration} />
            )}
          />
        </div>
      </div>

      {/* Room for expansion */}
      <div className="card" style={{ marginTop: '1rem', opacity: .75 }}>
        <h3 style={{ marginTop: 0 }}>More dashboards</h3>
        <div style={{ color: 'rgba(125,211,252,0.8)' }}>Space reserved for quick charts and cross-app insights.</div>
      </div>
    </div>
  )
}
