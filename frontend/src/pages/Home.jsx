import React, { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api'
import { AnimatedNumber, LoadingLine, StatCard, formatDuration, formatNumberShort } from '../components/shared'

export default function Home() {
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const hasLoadedOnceRef = useRef(false)
  useEffect(() => { hasLoadedOnceRef.current = hasLoadedOnce }, [hasLoadedOnce])

  const [spotifyStats, setSpotifyStats] = useState(null)
  const [workoutTotals, setWorkoutTotals] = useState(null)
  const [workoutStreamStats, setWorkoutStreamStats] = useState(null)

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
    <>
      <h2>Home</h2>

      <div className="section">
        <h3>Spotify</h3>
        <div className="stat-grid">
          <StatCard label="Total Streams" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={spotifyStats?.totalStreams ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Unique Tracks" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={spotifyStats?.uniqueTracks ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Unique Artists" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={spotifyStats?.uniqueArtists ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Total Minutes" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={Math.floor((spotifyStats?.msListened ?? 0) / 1000 / 60)} formatter={formatNumberShort} />} />
          <StatCard label="Total Time" value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={spotifyStats?.msListened ?? 0} formatter={formatDuration} />} />
        </div>
      </div>

      <div className="section">
        <h3>Workout</h3>
        <div className="stat-grid">
          <StatCard label="Total Workouts" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalWorkouts ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Total Volume" value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={workoutTotals?.totalVolume ?? 0} formatter={(n) => `${formatNumberShort(n)} kg`} />} />
          <StatCard label="Total Sets" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalSets ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Total Reps" value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalReps ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Total Time" value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={(workoutTotals?.totalTimeSeconds ?? 0) * 1000} formatter={formatDuration} />} />
        </div>
      </div>

      <div className="section">
        <h3>Music During Workouts</h3>
        <div className="stat-grid">
          <StatCard label="Streams During Workouts" value={!hasLoadedOnce ? <LoadingLine width={160} /> : <AnimatedNumber value={workoutStreamStats?.streams ?? 0} formatter={formatNumberShort} />} />
          <StatCard label="Time Streamed" value={!hasLoadedOnce ? <LoadingLine width={200} /> : <AnimatedNumber value={(workoutStreamStats?.totalTimeSeconds ?? 0) * 1000} formatter={formatDuration} />} />
        </div>
      </div>

      <div className="card" style={{ opacity: 0.6 }}>
        <h3>More dashboards</h3>
        <p style={{ color: 'var(--color-accent)' }}>Space reserved for quick charts and cross-app insights.</p>
      </div>
    </>
  )
}
