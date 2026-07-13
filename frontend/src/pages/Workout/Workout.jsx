import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import {
  formatDate,
  formatNumberShort,
} from '../../components/shared'
import Icon from '../../components/icons/Icon'
import { isNativeMobileApp } from '../../mobilePlatform'
import {
  getSyncedActivityMetrics,
  mergeLiveStepIntoActivitySummary,
  subscribeToLiveStepUpdates,
  syncHealthConnectSteps,
} from '../../nativeHealth.mjs'

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
  activitySummary,
  activityStatus,
  startWorkout,
  onSyncSteps,
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
        <span className="native-eyebrow">Today</span>
        <h1 id="native-workout-title">Gym</h1>
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
            <NativeWorkoutStat label="Steps" value="..." />
          </>
        ) : (
          <>
            <NativeWorkoutStat label="Week" value={stats.thisWeek} />
            <NativeWorkoutStat label="Sets" value={stats.totalSets} />
            <NativeWorkoutStat label="Volume" value={`${stats.totalVolume} kg`} />
            <NativeWorkoutStat label="Steps" value={formatNumberShort(activitySummary.today?.steps || 0)} />
          </>
        )}
      </section>

      <section className="native-workout-card">
        <div className="native-section-head">
          <h2>Steps</h2>
            <button type="button" onClick={onSyncSteps}>Sync steps</button>
        </div>
        <div className="native-health-summary">
          <div>
            <span>Today</span>
            <strong>{activitySummary.today?.steps ?? 0}</strong>
            <small>steps</small>
          </div>
          <div>
            <span>7-day steps</span>
            <strong>{activitySummary.week?.steps ?? 0}</strong>
            <small>{activitySummary.week?.daysWithData ?? 0} days synced</small>
          </div>
        </div>
        <div className="native-workout-empty">{activityStatus || 'Live steps update while the app is open.'}</div>
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
  const [activitySummary, setActivitySummary] = useState({
    today: null,
    week: { steps: 0, distanceMeters: 0, activeCalories: 0, daysWithData: 0 },
    recent: [],
  })
  const [activityStatus, setActivityStatus] = useState('')

  useEffect(() => { loadDashboard(); loadPRs() }, [])

  useEffect(() => {
    if (!isNativeMobileApp()) return undefined
    let cancelled = false
    let unsubscribe = null
    subscribeToLiveStepUpdates((event) => {
      if (cancelled) return
      setActivitySummary((current) => mergeLiveStepIntoActivitySummary(current, event))
      setActivityStatus('Live steps streaming.')
    })
      .then((nextUnsubscribe) => {
        unsubscribe = nextUnsubscribe
      })
      .catch(() => {})

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

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
      const activity = await getSyncedActivityMetrics({ days: 7 }).catch(() => null)
      if (activity) setActivitySummary(activity)

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

  async function syncSteps() {
    setActivityStatus('Syncing Health Connect steps...')
    try {
      await syncHealthConnectSteps({ days: 30 })
      const latest = await getSyncedActivityMetrics({ days: 7 })
      setActivitySummary(latest)
      setActivityStatus('Steps synced.')
    } catch (error) {
      setActivityStatus(error.message || 'Could not sync steps.')
    }
  }

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
        activitySummary={activitySummary}
        activityStatus={activityStatus}
        startWorkout={startWorkout}
        onSyncSteps={syncSteps}
        onRefreshPrs={loadPRs}
        navigate={navigate}
      />
    )
}
