import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { AnimatedNumber, LoadingLine, StatCard, formatDuration, formatNumberShort } from '../components/shared'
import ScrollReveal from '../components/ScrollReveal'
import PageHeader from '../components/PageHeader'
import ProgressRing from '../components/ProgressRing'
import Icon from '../components/icons/Icon'

export default function Home() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const hasLoadedOnceRef = useRef(false)
  useEffect(() => { hasLoadedOnceRef.current = hasLoadedOnce }, [hasLoadedOnce])

  const [spotifyStats, setSpotifyStats] = useState(null)
  const [workoutTotals, setWorkoutTotals] = useState(null)
  const [workoutStreamStats, setWorkoutStreamStats] = useState(null)
  const [habitsSummary, setHabitsSummary] = useState(null)
  const [habitsTrends, setHabitsTrends] = useState(null)
  const [workoutTrends, setWorkoutTrends] = useState(null)
  const [financeSummary, setFinanceSummary] = useState(null)
  const [recentSessions, setRecentSessions] = useState(null)

  useEffect(() => {
    const ctrl = new AbortController()
    async function load() {
      try {
        const results = await Promise.allSettled([
          apiFetch('/streams/stats?timeframe=all', { signal: ctrl.signal }),
          apiFetch('/workout/sessions?page=1&limit=1', { signal: ctrl.signal }),
          apiFetch('/dashboard/streams/workout', { signal: ctrl.signal }),
          apiFetch('/habits/summary', { signal: ctrl.signal }),
          apiFetch('/habits/trends', { signal: ctrl.signal }),
          apiFetch('/workout/sessions/trends', { signal: ctrl.signal }),
          apiFetch('/finance/transactions/summary', { signal: ctrl.signal }),
          apiFetch('/workout/sessions/recent', { signal: ctrl.signal }),
        ])
        if (ctrl.signal.aborted) return

        const [sp, wk, wms, hs, ht, wt, fs, rs] = results.map(r =>
          r.status === 'fulfilled' ? r.value : null
        )

        if (sp) setSpotifyStats(sp)
        if (wk) setWorkoutTotals({
          totalWorkouts: wk.totalWorkouts ?? (Array.isArray(wk.sessions) ? wk.sessions.length : 0),
          totalVolume: wk.totalVolume ?? 0,
          totalSets: wk.totalSets ?? 0,
          totalReps: wk.totalReps ?? 0,
          totalTimeSeconds: wk.totalTimeSeconds ?? 0,
        })
        if (wms) setWorkoutStreamStats(wms)
        if (hs) setHabitsSummary(hs)
        if (ht) setHabitsTrends(ht)
        if (wt) setWorkoutTrends(wt)
        if (fs) setFinanceSummary(fs)
        if (rs) setRecentSessions(rs)
        if (!hasLoadedOnceRef.current) { setHasLoadedOnce(true); hasLoadedOnceRef.current = true }
      } catch {
        // ignore for home summary
      }
    }
    load()
    return () => ctrl.abort()
  }, [])

  // Derive habit stats
  const habitsArray = Array.isArray(habitsSummary) ? habitsSummary : []
  const totalHabits = habitsArray.length
  const todayCompleted = habitsArray.filter(h => h.completedToday).length
  const habitCompletionPct = totalHabits > 0 ? Math.round((todayCompleted / totalHabits) * 100) : 0
  const bestStreak = habitsArray.reduce((max, h) => Math.max(max, h.longestStreak ?? 0), 0)

  // Derive finance stats
  const monthlySpent = financeSummary?.totalExpenses ?? financeSummary?.total ?? 0
  const monthlyIncome = financeSummary?.totalIncome ?? 0

  // Build recent activity feed
  const activityItems = buildActivityFeed(habitsArray, recentSessions)

  // Quick action links
  const quickActions = [
    { icon: 'dumbbell', label: t('home.startWorkout'), color: '#4ade80', path: '/workout/active' },
    { icon: 'check-circle', label: t('home.logHabit'), color: '#a78bfa', path: '/habits' },
    { icon: 'receipt', label: t('home.addTransaction'), color: '#fbbf24', path: '/finance/transactions' },
    { icon: 'headphones', label: t('home.viewStreams'), color: 'var(--color-accent)', path: '/spotify' },
  ]

  return (
    <>
      <PageHeader icon="home" title="Dashboard" />

      {/* === Top Stat Cards === */}
      <ScrollReveal>
        <div className="stat-grid">
          <StatCard
            icon="headphones"
            accentColor="var(--color-accent)"
            label={t('home.totalStreams')}
            value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={spotifyStats?.totalStreams ?? 0} formatter={formatNumberShort} />}
            trend={habitsTrends?.dailyCompletions}
          />
          <StatCard
            icon="dumbbell"
            accentColor="#4ade80"
            label={t('home.totalWorkouts')}
            value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalWorkouts ?? 0} formatter={formatNumberShort} />}
            trend={workoutTrends?.dailyVolume}
          />
          <StatCard
            icon="check-circle"
            accentColor="#a78bfa"
            label={t('home.habitsToday')}
            value={!hasLoadedOnce ? <LoadingLine width={80} /> : `${todayCompleted}/${totalHabits}`}
            trend={habitsTrends?.dailyCompletions}
          />
          <StatCard
            icon="wallet"
            accentColor="#fbbf24"
            label={t('home.monthlySpent')}
            value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={Math.abs(monthlySpent)} formatter={(n) => `$${formatNumberShort(n)}`} />}
          />
        </div>
      </ScrollReveal>

      {/* === Widget Grid === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>

        {/* Recent Activity */}
        <ScrollReveal delay={100}>
          <div className="card" style={{ minHeight: 220 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Icon name="activity" size={18} />
              {t('home.recentActivity')}
            </h3>
            {!hasLoadedOnce ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1,2,3,4].map(i => <LoadingLine key={i} width="100%" />)}
              </div>
            ) : activityItems.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('common.noData')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activityItems.slice(0, 6).map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 0',
                    borderBottom: i < Math.min(activityItems.length, 6) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${item.color}15`, color: item.color, flexShrink: 0,
                    }}>
                      <Icon name={item.icon} size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.text}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        {item.sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Habits Progress */}
        <ScrollReveal delay={200}>
          <div className="card" style={{ minHeight: 220 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Icon name="target" size={18} />
              {t('home.habitsProgress')}
            </h3>
            {!hasLoadedOnce ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1,2,3].map(i => <LoadingLine key={i} width="100%" />)}
              </div>
            ) : totalHabits === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t('common.noData')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ProgressRing value={habitCompletionPct} size={96} strokeWidth={6} color="#a78bfa" />
                  <span style={{
                    position: 'absolute', fontSize: '1.25rem', fontWeight: 700,
                    background: 'linear-gradient(135deg, #a78bfa, color-mix(in srgb, #a78bfa 60%, white))',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    {habitCompletionPct}%
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                  {todayCompleted} {t('home.ofTotal')} {totalHabits} {t('home.completedToday')}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', width: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#a78bfa' }}>{bestStreak}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{t('home.bestStreak')}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#a78bfa' }}>
                      {habitsArray.reduce((sum, h) => sum + (h.currentStreak ?? 0), 0)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{t('home.activeStreaks')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Quick Actions */}
        <ScrollReveal delay={300}>
          <div className="card" style={{ minHeight: 220 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Icon name="zap" size={18} />
              {t('home.quickActions')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => nav(action.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: 8,
                    background: `${action.color}08`, border: `1px solid ${action.color}20`,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    color: 'inherit', width: '100%', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${action.color}15`; e.currentTarget.style.borderColor = `${action.color}40` }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${action.color}08`; e.currentTarget.style.borderColor = `${action.color}20` }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${action.color}15`, color: action.color, flexShrink: 0,
                  }}>
                    <Icon name={action.icon} size={18} />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{action.label}</span>
                  <Icon name="chevron-right" size={16} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* === Domain Detail Sections === */}
      <ScrollReveal delay={400}>
        <div className="section" style={{ marginTop: '1.5rem' }}>
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

      <ScrollReveal delay={500}>
        <div className="section">
          <h3>{t('home.workout')}</h3>
          <div className="stat-grid">
            <StatCard icon="dumbbell" accentColor="#4ade80" label={t('home.totalWorkouts')} value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalWorkouts ?? 0} formatter={formatNumberShort} />} trend={workoutTrends?.dailyVolume} />
            <StatCard icon="weight" accentColor="#4ade80" label={t('home.totalVolume')} value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={workoutTotals?.totalVolume ?? 0} formatter={(n) => `${formatNumberShort(n)} kg`} />} />
            <StatCard icon="layers" accentColor="#4ade80" label={t('home.totalSets')} value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalSets ?? 0} formatter={formatNumberShort} />} />
            <StatCard icon="repeat" accentColor="#4ade80" label={t('home.totalReps')} value={!hasLoadedOnce ? <LoadingLine width={80} /> : <AnimatedNumber value={workoutTotals?.totalReps ?? 0} formatter={formatNumberShort} />} />
            <StatCard icon="timer" accentColor="#4ade80" label={t('home.totalTime')} value={!hasLoadedOnce ? <LoadingLine width={120} /> : <AnimatedNumber value={(workoutTotals?.totalTimeSeconds ?? 0) * 1000} formatter={formatDuration} />} />
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={600}>
        <div className="section">
          <h3>{t('home.musicDuringWorkouts')}</h3>
          <div className="stat-grid">
            <StatCard icon="headphones" accentColor="var(--color-accent)" label={t('home.streamsDuringWorkouts')} value={!hasLoadedOnce ? <LoadingLine width={160} /> : <AnimatedNumber value={workoutStreamStats?.streams ?? 0} formatter={formatNumberShort} />} />
            <StatCard icon="clock" accentColor="var(--color-accent)" label={t('home.timeStreamed')} value={!hasLoadedOnce ? <LoadingLine width={200} /> : <AnimatedNumber value={(workoutStreamStats?.totalTimeSeconds ?? 0) * 1000} formatter={formatDuration} />} />
          </div>
        </div>
      </ScrollReveal>
    </>
  )
}

/**
 * Build a merged activity feed from habits and workout sessions
 */
function buildActivityFeed(habitsArray, recentSessions) {
  const items = []

  // Add habit completions (today)
  for (const h of habitsArray) {
    if (h.completedToday) {
      items.push({
        icon: 'check-circle',
        color: '#a78bfa',
        text: h.name,
        sub: 'Completed today',
        time: Date.now(),
      })
    }
  }

  // Add recent workout sessions
  if (Array.isArray(recentSessions)) {
    for (const s of recentSessions.slice(0, 5)) {
      items.push({
        icon: 'dumbbell',
        color: '#4ade80',
        text: s.name || 'Workout session',
        sub: s.date ? new Date(s.date).toLocaleDateString() : '',
        time: s.date ? new Date(s.date).getTime() : 0,
      })
    }
  }

  // Sort by most recent
  items.sort((a, b) => b.time - a.time)
  return items
}
