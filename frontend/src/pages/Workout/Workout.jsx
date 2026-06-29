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
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import { isNativeMobileApp } from '../../mobilePlatform'

function toArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.sessions)) return value.sessions
  if (Array.isArray(value?.records)) return value.records
  return []
}

function toWorkoutStats(value) {
  if (!value || Array.isArray(value)) return {}
  return value
}

function NativeWorkoutStat({ label, value }) {
  return (
    <div className="native-workout-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function NativeWorkoutRow({ icon, label, description, onClick }) {
  return (
    <button type="button" className="native-workout-row" onClick={onClick}>
      <span className="native-workout-row__icon" aria-hidden="true">
        <Icon name={icon} size={19} />
      </span>
      <span className="native-workout-row__copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <Icon name="chevron-right" size={18} aria-hidden="true" />
    </button>
  )
}

function NativeWorkoutView({
  loading,
  activeSession,
  recentSessions,
  stats,
  latestWeight,
  prs,
  prsLoading,
  loadError,
  actionError,
  startWorkout,
  onRefreshPrs,
  navigate,
}) {
  const primaryLabel = activeSession ? 'Continue workout' : 'Start workout'
  const primaryMeta = activeSession
    ? `${activeSession.sets?.length || 0} sets started ${formatDate(activeSession.startAt)}`
    : 'Open the active session logger'

  return (
    <main className="native-workout-page">
      <section className="native-workout-hero" aria-labelledby="native-workout-title">
        <span className="native-eyebrow">Training</span>
        <h1 id="native-workout-title">Workout</h1>
        <p>{activeSession ? 'A session is already running.' : 'Start fast, then log sets from the active session.'}</p>
        <button
          type="button"
          className="native-workout-primary"
          onClick={activeSession ? () => navigate('/workout/active') : startWorkout}
        >
          <span aria-hidden="true"><Icon name={activeSession ? 'play' : 'dumbbell'} size={22} /></span>
          <span>
            <strong>{primaryLabel}</strong>
            <small>{primaryMeta}</small>
          </span>
          <Icon name="chevron-right" size={18} aria-hidden="true" />
        </button>
      </section>

      {loadError && <div className="alert-error">{loadError}</div>}
      {actionError && <div className="alert-error">{actionError}</div>}

      <section className="native-workout-stats" aria-label="Workout summary">
        {loading ? (
          <>
            <NativeWorkoutStat label="Week" value="..." />
            <NativeWorkoutStat label="Sets" value="..." />
            <NativeWorkoutStat label="Volume" value="..." />
          </>
        ) : (
          <>
            <NativeWorkoutStat label="Week" value={stats.thisWeek} />
            <NativeWorkoutStat label="Sets" value={stats.totalSets} />
            <NativeWorkoutStat label="Volume" value={`${stats.totalVolume} kg`} />
          </>
        )}
      </section>

      <section className="native-workout-card">
        <div className="native-section-head">
          <h2>Recent sessions</h2>
          <button type="button" onClick={() => navigate('/workout/history')}>History</button>
        </div>
        {loading ? (
          <div className="native-workout-empty">Loading local workout cache...</div>
        ) : recentSessions.length === 0 ? (
          <div className="native-workout-empty">No workouts logged yet.</div>
        ) : (
          <div className="native-workout-session-list">
            {recentSessions.slice(0, 3).map((session, index) => (
              <button
                type="button"
                className="native-workout-session"
                key={session.id || `${session.name || 'session'}-${index}`}
                onClick={() => navigate('/workout/history')}
              >
                <span>
                  <strong>{session.name || session.title || 'Workout session'}</strong>
                  <small>{formatDate(session.startAt || session.date)}</small>
                </span>
                <Icon name="chevron-right" size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="native-workout-list" aria-label="Workout tools">
        <NativeWorkoutRow
          icon="bar-chart-3"
          label="Workout history"
          description={`${stats.totalSessions || 0} total sessions`}
          onClick={() => navigate('/workout/history')}
        />
        <NativeWorkoutRow
          icon="folder-open"
          label="Exercises"
          description="Manage movements and defaults"
          onClick={() => navigate('/workout/exercises')}
        />
        <NativeWorkoutRow
          icon="scale"
          label="Bodyweight"
          description={latestWeight ? `${latestWeight.weightKg} kg on ${formatDate(latestWeight.date)}` : 'Track weight entries'}
          onClick={() => navigate('/workout/bodyweight')}
        />
      </section>

      <section className="native-workout-card">
        <div className="native-section-head">
          <h2>Personal records</h2>
          <button type="button" onClick={onRefreshPrs}>Refresh</button>
        </div>
        {prsLoading ? (
          <div className="native-workout-empty">Checking records...</div>
        ) : prs.length === 0 ? (
          <div className="native-workout-empty">No personal records yet.</div>
        ) : (
          <div className="native-workout-pr-list">
            {prs.slice(0, 4).map((pr, index) => (
              <div className="native-workout-pr" key={pr.exerciseId || `${pr.exerciseName || 'pr'}-${index}`}>
                <span>
                  <strong>{pr.exerciseName || 'Unknown exercise'}</strong>
                  <small>{pr.reps != null ? `${pr.reps} reps` : 'Best set'}</small>
                </span>
                <strong>{pr.maxWeight} kg</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

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
  const [prs, setPrs] = useState([])
  const [prsLoading, setPrsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => { loadDashboard(); loadPRs() }, [])

  async function loadDashboard() {
    setLoading(true)
    setLoadError('')
    try {
      const activeSession = await api.get('/workout/sessions/active')
      if (activeSession) setActiveSession(activeSession)

      const recent = await api.get('/workout/sessions/recent')
      const recentList = toArray(recent)
      setRecentSessions(recentList)

      const bodyweights = await api.get('/workout/bodyweight')
      const bodyweightList = toArray(bodyweights)
      if (bodyweightList.length > 0) {
        const sorted = [...bodyweightList].sort((a, b) => new Date(b.date) - new Date(a.date))
        setLatestWeight(sorted[0])
      }

      const sessionsData = toWorkoutStats(await api.get('/workout/sessions?page=1&limit=20'))

      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const thisWeek = recentList.filter(s => new Date(s.startAt || s.date) >= oneWeekAgo).length

      setStats({
        totalSessions: formatNumberShort(sessionsData.totalWorkouts) || 0,
        totalSets: formatNumberShort(sessionsData.totalSets) || 0,
        totalReps: formatNumberShort(sessionsData.totalReps) || 0,
        totalVolume: formatNumberShort(sessionsData.totalVolume) || 0,
        thisWeek
      })
    } catch (e) {
      console.error('Failed to load dashboard:', e)
      setLoadError('Could not refresh workout records. Showing any cached workout data that is available.')
    } finally {
      setLoading(false)
    }
  }

  async function loadPRs() {
    setPrsLoading(true)
    try {
      const data = await api.get('/workout/sessions/prs')
      setPrs(toArray(data))
    } catch (e) {
      console.error('Failed to load PRs:', e)
      setPrs([])
    } finally {
      setPrsLoading(false)
    }
  }

  async function startWorkout() {
    setActionError('')
    try {
      await api.post('/workout/sessions/start', {})
      navigate('/workout/active')
    } catch (e) {
      console.error('Failed to start workout:', e)
      setActionError('Could not start a workout. Check the API connection and try again.')
    }
  }

  if (isNativeMobileApp()) {
    return (
      <NativeWorkoutView
        loading={loading}
        activeSession={activeSession}
        recentSessions={recentSessions}
        stats={stats}
        latestWeight={latestWeight}
        prs={prs}
        prsLoading={prsLoading}
        loadError={loadError}
        actionError={actionError}
        startWorkout={startWorkout}
        onRefreshPrs={loadPRs}
        navigate={navigate}
      />
    )
  }

  return (
    <>
      <PageHeader icon="dumbbell" title="Workout" accentColor="#4ade80" />

      {loadError && <div className="alert-error" style={{ marginBottom: '1rem' }}>{loadError}</div>}
      {actionError && <div className="alert-error" style={{ marginBottom: '1rem' }}>{actionError}</div>}

      {loading ? (
        <SkeletonCard lines={2} widths={["30%", "50%"]} />
      ) : activeSession ? (
        <div
          className="card interactive"
          style={{ marginBottom: '1.5rem', background: 'var(--color-warning-muted)', borderColor: 'var(--color-warning)' }}
          onClick={() => navigate('/workout/active')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Icon name="play" size={32} style={{ color: 'var(--color-warning)' }} />
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
            <StatCard icon="dumbbell" accentColor="#4ade80" label="Total Workouts" value={stats.totalSessions} />
            <StatCard icon="calendar" accentColor="#4ade80" label="This Week" value={stats.thisWeek} />
            <StatCard icon="layers" accentColor="#4ade80" label="Total Sets" value={stats.totalSets} />
            <StatCard icon="repeat" accentColor="#4ade80" label="Total Reps" value={stats.totalReps} />
            <StatCard icon="weight" accentColor="#4ade80" label="Total Volume" value={`${stats.totalVolume} kg`} />
            {latestWeight && (
              <StatCard icon="scale" accentColor="#4ade80" label="Latest Weight" value={`${latestWeight.weightKg} kg`} subtitle={formatDate(latestWeight.date)} />
            )}
          </>
        )}
      </div>

      <div className="section">
        <h3>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { icon: 'dumbbell', label: 'Start Workout', onClick: startWorkout, accent: true },
            { icon: 'bar-chart-3', label: 'View History', onClick: () => navigate('/workout/history') },
            { icon: 'folder-open', label: 'Manage Exercises', onClick: () => navigate('/workout/exercises') },
            { icon: 'scale', label: 'Bodyweight', onClick: () => navigate('/workout/bodyweight') },
          ].map(action => (
            <button
              type="button"
              key={action.label}
              className="card interactive"
              style={{ padding: '1.5rem', textAlign: 'center', color: 'inherit', border: action.accent ? '2px solid var(--color-accent)' : undefined, background: action.accent ? 'var(--color-accent-muted)' : undefined }}
              onClick={action.onClick}
            >
              <Icon name={action.icon} size={40} style={{ marginBottom: '.5rem', color: 'var(--color-accent)' }} />
              <div style={{ fontWeight: 700 }}>{action.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
          <Icon name="trophy" size={20} style={{ color: '#4ade80' }} />
          <h3 style={{ margin: 0 }}>Personal Records</h3>
        </div>

        {prsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} widths={["40%", "60%"]} />)}
          </div>
        ) : prs.length === 0 ? (
          <div className="empty-state">No personal records yet. Start lifting to set your first PR!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {prs.map((pr, index) => {
              const isTop3 = index < 3
              const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']
              const medalColor = isTop3 ? medalColors[index] : null
              return (
                <div
                  key={pr.exerciseId || index}
                  className="card"
                  style={{
                    padding: '1rem 1.25rem',
                    borderLeft: isTop3 ? `4px solid ${medalColor}` : '4px solid var(--glass-border)',
                    background: isTop3 ? `${medalColor}08` : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    {isTop3 && (
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: `${medalColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon name="trophy" size={18} style={{ color: medalColor }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{pr.exerciseName || 'Unknown Exercise'}</span>
                        {isTop3 && (
                          <span style={{
                            fontSize: '.75rem', fontWeight: 700, padding: '2px 8px',
                            borderRadius: 'var(--radius-md)', background: `${medalColor}20`, color: medalColor,
                          }}>
                            #{index + 1}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#4ade80' }}>
                          {pr.maxWeight} kg
                        </span>
                        {pr.reps != null && (
                          <span style={{ fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>
                            {pr.reps} rep{pr.reps !== 1 ? 's' : ''}
                          </span>
                        )}
                        {pr.date && (
                          <span style={{ fontSize: '.85rem', color: 'var(--color-text-muted)' }}>
                            {formatDate(pr.date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
