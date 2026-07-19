import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../../api'
import Icon from '../../components/icons/Icon'
import { PageHeading, Register, RegisterRow, StatePanel, SummaryItem, SummaryStrip } from '../../components/record'
import { formatDate, formatNumberShort } from '../../components/shared'
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
  return !value || Array.isArray(value) ? {} : value
}

export default function Workout() {
  const navigate = useNavigate()
  const nativeApp = isNativeMobileApp()
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [recentSessions, setRecentSessions] = useState([])
  const [stats, setStats] = useState({ totalSessions: 0, totalSets: 0, totalReps: 0, totalVolume: 0, thisWeek: 0 })
  const [latestWeight, setLatestWeight] = useState(null)
  const [prs, setPrs] = useState([])
  const [prsLoading, setPrsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [activitySummary, setActivitySummary] = useState({ today: null, week: { steps: 0, distanceMeters: 0, activeCalories: 0, daysWithData: 0 }, recent: [] })
  const [activityStatus, setActivityStatus] = useState('')

  useEffect(() => { loadDashboard(); loadPRs() }, [])

  useEffect(() => {
    if (!nativeApp) return undefined
    let cancelled = false
    let unsubscribe = null
    subscribeToLiveStepUpdates((event) => {
      if (cancelled) return
      setActivitySummary((current) => mergeLiveStepIntoActivitySummary(current, event))
      setActivityStatus('Live steps streaming')
    }).then((next) => { unsubscribe = next }).catch(() => {})
    return () => { cancelled = true; unsubscribe?.() }
  }, [nativeApp])

  async function loadDashboard() {
    setLoading(true)
    setLoadError('')
    try {
      const [active, recent, bodyweights, sessionsData, activity] = await Promise.all([
        api.get('/workout/sessions/active').catch(() => null),
        api.get('/workout/sessions/recent'),
        api.get('/workout/bodyweight'),
        api.get('/workout/sessions?page=1&limit=20'),
        getSyncedActivityMetrics({ days: 7 }).catch(() => null),
      ])
      setActiveSession(active || null)
      const recentList = toArray(recent)
      setRecentSessions(recentList)
      const bodyweightList = toArray(bodyweights).sort((left, right) => new Date(right.date) - new Date(left.date))
      setLatestWeight(bodyweightList[0] || null)
      if (activity) setActivitySummary(activity)
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const sourceStats = toWorkoutStats(sessionsData)
      setStats({
        totalSessions: formatNumberShort(sourceStats.totalWorkouts) || 0,
        totalSets: formatNumberShort(sourceStats.totalSets) || 0,
        totalReps: formatNumberShort(sourceStats.totalReps) || 0,
        totalVolume: formatNumberShort(sourceStats.totalVolume) || 0,
        thisWeek: recentList.filter((session) => new Date(session.startAt || session.date) >= oneWeekAgo).length,
      })
    } catch (error) {
      console.error('Failed to load dashboard:', error)
      setLoadError('Workout records could not be refreshed. Cached records remain available.')
    } finally {
      setLoading(false)
    }
  }

  async function loadPRs() {
    setPrsLoading(true)
    try { setPrs(toArray(await api.get('/workout/sessions/prs'))) }
    catch { setPrs([]) }
    finally { setPrsLoading(false) }
  }

  async function startWorkout() {
    setActionError('')
    try {
      await api.post('/workout/sessions/start', {})
      navigate('/workout/active')
    } catch {
      setActionError('The workout could not be started. Check the connection and try again.')
    }
  }

  async function syncSteps() {
    setActivityStatus('Syncing Health Connect steps…')
    try {
      await syncHealthConnectSteps({ days: 30 })
      setActivitySummary(await getSyncedActivityMetrics({ days: 7 }))
      setActivityStatus('Steps synced just now')
    } catch (error) {
      setActivityStatus(error.message || 'Steps could not be synced')
    }
  }

  const primaryAction = activeSession ? () => navigate('/workout/active') : startWorkout
  const primaryLabel = activeSession ? 'Continue workout' : 'Start workout'

  return (
    <div className="record-gym">
      <PageHeading
        eyebrow="Gym · Today"
        title="Training"
        actions={nativeApp ? null : <button type="button" className="record-button record-button--primary" data-testid="gym-primary-action" onClick={primaryAction}><Icon name={activeSession ? 'play' : 'dumbbell'} size={17} />{primaryLabel}</button>}
      >
        <p>{activeSession ? 'A session is open. Continue directly where you left it.' : 'Start a session, choose an exercise, and log each set without leaving the workbench.'}</p>
      </PageHeading>

      {loadError && <StatePanel kind="offline" title="Using saved workout records" detail={loadError} action={<button type="button" className="record-button record-button--compact" onClick={loadDashboard}>Retry</button>} />}
      {actionError && <StatePanel kind="error" title="Workout not started" detail={actionError} action={<button type="button" className="record-button record-button--compact" onClick={startWorkout}>Try again</button>} />}

      <section className={`record-gym-primary${activeSession ? ' is-active' : ''}`}>
        <div className="record-gym-primary__icon"><Icon name={activeSession ? 'activity' : 'dumbbell'} size={24} /></div>
        <div className="record-gym-primary__copy">
          <span>{activeSession ? 'Session in progress' : 'No active session'}</span>
          <h2>{activeSession?.title || activeSession?.name || 'Ready for the first set'}</h2>
          <p>{activeSession ? `${activeSession.sets?.length || 0} sets · started ${formatDate(activeSession.startAt)}` : 'The active logger keeps previous-set context, rest time, and undo together.'}</p>
        </div>
        <button type="button" className="record-button record-button--primary" onClick={primaryAction}>{primaryLabel}<Icon name="arrow-right" size={16} /></button>
      </section>

      <SummaryStrip>
        <SummaryItem label="This week" value={loading ? '—' : String(stats.thisWeek)} detail="Sessions" />
        <SummaryItem label="Total sets" value={loading ? '—' : String(stats.totalSets)} detail="All recorded" />
        <SummaryItem label="Volume" value={loading ? '—' : `${stats.totalVolume} kg`} detail="All recorded" />
        <SummaryItem label="Today" value={loading ? '—' : formatNumberShort(activitySummary.today?.steps || 0)} detail="Steps" />
      </SummaryStrip>

      <div className="record-gym__grid">
        <Register title="Recent sessions" description="Most recent training records" action={<button type="button" className="record-register-action" onClick={() => navigate('/workout/history')}>Full history <Icon name="arrow-right" size={14} /></button>}>
          {loading ? <StatePanel kind="loading" title="Opening session history" detail="Saved sessions appear first." /> : recentSessions.length === 0 ? <StatePanel kind="empty" title="No sessions yet" detail="Start a workout to create the first training record." /> : recentSessions.slice(0, 5).map((session, index) => (
            <RegisterRow key={session.id || `${session.name || 'session'}-${index}`} leading={<span className="record-gym__row-icon"><Icon name="dumbbell" size={16} /></span>} meta={formatDate(session.startAt || session.date)} action={<button type="button" className="record-cash-row__edit" aria-label={`Open ${session.name || session.title || 'workout session'} history`} onClick={() => navigate('/workout/history')}><Icon name="chevron-right" size={16} /></button>}>
              <strong>{session.name || session.title || 'Workout session'}</strong>
              <span>{session.sets?.length ? `${session.sets.length} sets` : 'Completed session'}</span>
            </RegisterRow>
          ))}
        </Register>

        {nativeApp ? (
          <details className="record-gym-tools">
            <summary>
              <span><strong>Training tools</strong><small>Steps, bodyweight, records, and exercises</small></span>
              <Icon name="chevron-down" size={16} />
            </summary>
            <Register title="Training records" description="Measurements and personal bests">
              <RegisterRow leading={<Icon name="footprints" size={17} />} meta={activitySummary.today?.steps ?? 0} action={<button type="button" className="record-register-action" onClick={syncSteps}>Sync steps</button>}><strong>Steps today</strong><span>{activityStatus || `${activitySummary.week?.daysWithData ?? 0} days available`}</span></RegisterRow>
              <RegisterRow leading={<Icon name="scale" size={17} />} meta={latestWeight ? `${latestWeight.weightKg} kg` : '—'} action={<button type="button" className="record-cash-row__edit" aria-label="Open bodyweight" onClick={() => navigate('/workout/bodyweight')}><Icon name="chevron-right" size={16} /></button>}><strong>Bodyweight</strong><span>{latestWeight ? formatDate(latestWeight.date) : 'No entries yet'}</span></RegisterRow>
              <RegisterRow leading={<Icon name="trophy" size={17} />} meta={prsLoading ? '…' : prs.length} action={<button type="button" className="record-register-action" onClick={loadPRs}>Refresh records</button>}><strong>Personal records</strong><span>{prs[0] ? `${prs[0].exerciseName || 'Exercise'} · ${prs[0].maxWeight} kg` : 'No records yet'}</span></RegisterRow>
              <RegisterRow leading={<Icon name="folder-open" size={17} />} meta="Catalogue" action={<button type="button" className="record-cash-row__edit" aria-label="Open exercises" onClick={() => navigate('/workout/exercises')}><Icon name="chevron-right" size={16} /></button>}><strong>Exercises</strong><span>Movements and defaults</span></RegisterRow>
            </Register>
          </details>
        ) : (
          <Register title="Training records" description="Measurements and personal bests">
            <RegisterRow leading={<Icon name="footprints" size={17} />} meta={activitySummary.today?.steps ?? 0} action={<button type="button" className="record-register-action" onClick={syncSteps}>Sync steps</button>}><strong>Steps today</strong><span>{activityStatus || `${activitySummary.week?.daysWithData ?? 0} days available`}</span></RegisterRow>
            <RegisterRow leading={<Icon name="scale" size={17} />} meta={latestWeight ? `${latestWeight.weightKg} kg` : '—'} action={<button type="button" className="record-cash-row__edit" aria-label="Open bodyweight" onClick={() => navigate('/workout/bodyweight')}><Icon name="chevron-right" size={16} /></button>}><strong>Bodyweight</strong><span>{latestWeight ? formatDate(latestWeight.date) : 'No entries yet'}</span></RegisterRow>
            <RegisterRow leading={<Icon name="trophy" size={17} />} meta={prsLoading ? '…' : prs.length} action={<button type="button" className="record-register-action" onClick={loadPRs}>Refresh records</button>}><strong>Personal records</strong><span>{prs[0] ? `${prs[0].exerciseName || 'Exercise'} · ${prs[0].maxWeight} kg` : 'No records yet'}</span></RegisterRow>
            <RegisterRow leading={<Icon name="folder-open" size={17} />} meta="Catalogue" action={<button type="button" className="record-cash-row__edit" aria-label="Open exercises" onClick={() => navigate('/workout/exercises')}><Icon name="chevron-right" size={16} /></button>}><strong>Exercises</strong><span>Movements and defaults</span></RegisterRow>
          </Register>
        )}
      </div>
    </div>
  )
}
