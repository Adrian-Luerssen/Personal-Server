import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../api'
import { AnimatedNumber, LoadingLine, StatCard, formatDuration, formatNumberShort } from '../components/shared'
import ScrollReveal from '../components/ScrollReveal'
import PageHeader from '../components/PageHeader'

export default function Home() {
  const { t } = useTranslation()
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
      <PageHeader icon="home" title="Dashboard" />

      <ScrollReveal>
        <div className="section">
          <h3>{t('home.spotify')}</h3>
          <div className="stat-grid">
            <StatCard icon="play-circle" accentColor="var(--color-accent)" label={t('home.totalStreams')} value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={spotifyStats?.totalStreams ?? 0} formatter={formatNumberShort} />} />
            <StatCard icon="disc" accentColor="var(--color-accent)" label={t('home.uniqueTracks')} value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={spotifyStats?.uniqueTracks ?? 0} formatter={formatNumberShort} />} />
            <StatCard icon="mic" accentColor="var(--color-accent)" label={t('home.uniqueArtists')} value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={spotifyStats?.uniqueArtists ?? 0} formatter={formatNumberShort} />} />
            <StatCard icon="clock" accentColor="var(--color-accent)" label={t('home.totalMinutes')} value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={Math.floor((spotifyStats?.msListened ?? 0) / 1000 / 60)} formatter={formatNumberShort} />} />
            <StatCard icon="timer" accentColor="var(--color-accent)" label={t('home.totalTime')} value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={spotifyStats?.msListened ?? 0} formatter={formatDuration} />} />
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="section">
          <h3>{t('home.workout')}</h3>
          <div className="stat-grid">
            <StatCard icon="dumbbell" accentColor="#4ade80" label={t('home.totalWorkouts')} value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalWorkouts ?? 0} formatter={formatNumberShort} />} />
            <StatCard icon="weight" accentColor="#4ade80" label={t('home.totalVolume')} value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={workoutTotals?.totalVolume ?? 0} formatter={(n) => `${formatNumberShort(n)} kg`} />} />
            <StatCard icon="layers" accentColor="#4ade80" label={t('home.totalSets')} value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalSets ?? 0} formatter={formatNumberShort} />} />
            <StatCard icon="repeat" accentColor="#4ade80" label={t('home.totalReps')} value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalReps ?? 0} formatter={formatNumberShort} />} />
            <StatCard icon="timer" accentColor="#4ade80" label={t('home.totalTime')} value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={(workoutTotals?.totalTimeSeconds ?? 0) * 1000} formatter={formatDuration} />} />
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <div className="section">
          <h3>{t('home.musicDuringWorkouts')}</h3>
          <div className="stat-grid">
            <StatCard icon="headphones" accentColor="var(--color-accent)" label={t('home.streamsDuringWorkouts')} value={!hasLoadedOnce ? <LoadingLine width={160} /> : <AnimatedNumber value={workoutStreamStats?.streams ?? 0} formatter={formatNumberShort} />} />
            <StatCard icon="clock" accentColor="var(--color-accent)" label={t('home.timeStreamed')} value={!hasLoadedOnce ? <LoadingLine width={200} /> : <AnimatedNumber value={(workoutStreamStats?.totalTimeSeconds ?? 0) * 1000} formatter={formatDuration} />} />
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={300}>
        <div className="card" style={{ opacity: 0.6 }}>
          <h3>{t('home.moreDashboards')}</h3>
          <p style={{ color: 'var(--color-accent)' }}>{t('home.moreDashboardsDesc')}</p>
        </div>
      </ScrollReveal>
    </>
  )
}
