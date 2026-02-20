import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import {
  StatCard,
  SessionCard,
  SkeletonStatCard,
  SkeletonSessionCard,
  SkeletonCard,
  formatDate,
  formatNumberShort,
} from '../../components/shared'

export default function Workout() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [recentSessions, setRecentSessions] = useState([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalSets: 0,
    totalReps: 0,
    totalVolume: 0,
    thisWeek: 0
  })
  const [latestWeight, setLatestWeight] = useState(null)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    setLoading(true)
    try {
      const activeSession = await api.get('/workout/sessions/active')
      if (activeSession) setActiveSession(activeSession)

      const recent = await api.get('/workout/sessions/recent')
      setRecentSessions(recent || [])

      const bodyweights = await api.get('/workout/bodyweight')
      if (bodyweights && bodyweights.length > 0) {
        const sorted = [...bodyweights].sort((a, b) => new Date(b.date) - new Date(a.date))
        setLatestWeight(sorted[0])
      }

      const sessionsData = await api.get('/workout/sessions?page=1&limit=20')

      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const thisWeek = recent.filter(s => new Date(s.startAt) >= oneWeekAgo).length

      setStats({
        totalSessions: formatNumberShort(sessionsData.totalWorkouts) || 0,
        totalSets: formatNumberShort(sessionsData.totalSets) || 0,
        totalReps: formatNumberShort(sessionsData.totalReps) || 0,
        totalVolume: formatNumberShort(sessionsData.totalVolume) || 0,
        thisWeek
      })
    } catch (e) {
      console.error('Failed to load dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  async function startWorkout() {
    try {
      await api.post('/workout/sessions/start', {})
      navigate('/workout/active')
    } catch (e) {
      console.error('Failed to start workout:', e)
    }
  }

  return (
    <>
      <h2><span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 8 }}>fitness_center</span>Workout Tracker</h2>

      {loading ? (
        <SkeletonCard lines={2} widths={["30%", "50%"]} />
      ) : activeSession ? (
        <div
          className="card interactive"
          style={{ marginBottom: '1.5rem', background: 'var(--color-warning-muted)', borderColor: 'var(--color-warning)' }}
          onClick={() => navigate('/workout/active')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="material-icons" style={{ fontSize: '2rem', color: 'var(--color-warning)' }}>directions_run</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-warning)' }}>Workout in Progress</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '.9rem', marginTop: 4 }}>
                {activeSession.sets?.length || 0} sets &bull; Started {formatDate(activeSession.startAt)}
              </div>
            </div>
            <button className="btn" onClick={(e) => { e.stopPropagation(); navigate('/workout/active') }}>Continue &rarr;</button>
          </div>
        </div>
      ) : null}

      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Workouts" value={stats.totalSessions} />
            <StatCard label="This Week" value={stats.thisWeek} />
            <StatCard label="Total Sets" value={stats.totalSets} />
            <StatCard label="Total Reps" value={stats.totalReps} />
            <StatCard label="Total Volume" value={`${stats.totalVolume} kg`} />
            {latestWeight && (
              <StatCard label="Latest Weight" value={`${latestWeight.weightKg} kg`} subtitle={formatDate(latestWeight.date)} />
            )}
          </>
        )}
      </div>

      <div className="section">
        <h3>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { icon: 'fitness_center', label: 'Start Workout', onClick: startWorkout, accent: true },
            { icon: 'bar_chart', label: 'View History', onClick: () => navigate('/workout/history') },
            { icon: 'folder_open', label: 'Manage Exercises', onClick: () => navigate('/workout/exercises') },
            { icon: 'monitor_weight', label: 'Bodyweight', onClick: () => navigate('/workout/bodyweight') },
            { icon: 'file_download', label: 'Import Data', onClick: () => navigate('/workout/import') },
          ].map(action => (
            <button
              key={action.label}
              className="card interactive"
              style={{ padding: '1.5rem', textAlign: 'center', color: 'inherit', border: action.accent ? '2px solid var(--color-accent)' : undefined, background: action.accent ? 'var(--color-accent-muted)' : undefined }}
              onClick={action.onClick}
            >
              <span className="material-icons" style={{ fontSize: '2.5rem', marginBottom: '.5rem', color: 'var(--color-accent)' }}>{action.icon}</span>
              <div style={{ fontWeight: 700 }}>{action.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
          <h3>Recent Workouts</h3>
          <button className="btn small" onClick={() => navigate('/workout/history')}>View All &rarr;</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonSessionCard key={i} />)}
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="empty-state">No workouts yet. Start your first workout!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentSessions.map(session => (
              <SessionCard key={session.id} session={session} onClick={() => navigate('/workout/history')} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
