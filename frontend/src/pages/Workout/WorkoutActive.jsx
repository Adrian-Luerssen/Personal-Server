import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api, queueApiMutation, updateApiCache } from '../../api'
import Icon from '../../components/icons/Icon'
import { PageHeading, StatePanel } from '../../components/record'
import ExerciseBlock from './components/ExerciseBlock'
import { completeSetOptimistically, createNextSet } from './workoutViewModel.mjs'

function durationLabel(startAt) {
  if (!startAt) return '0:00'
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startAt).getTime()) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default function WorkoutActive() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [sets, setSets] = useState([])
  const [exercises, setExercises] = useState([])
  const [selectedExerciseIds, setSelectedExerciseIds] = useState([])
  const [exerciseToAdd, setExerciseToAdd] = useState('')
  const [drafts, setDrafts] = useState({})
  const [savingExerciseId, setSavingExerciseId] = useState(null)
  const [undoSet, setUndoSet] = useState(null)
  const [restEndsAt, setRestEndsAt] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [finishConfirmationOpen, setFinishConfirmationOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get('/workout/sessions/active').catch(() => null),
      api.get('/workout/exercises').catch(() => []),
    ]).then(([active, exerciseList]) => {
      if (cancelled) return
      const activeSets = [...(active?.sets || [])].sort((left, right) => left.order - right.order)
      setSession(active)
      setSets(activeSets.map((set) => ({ ...set, completed: true })))
      setExercises(Array.isArray(exerciseList) ? exerciseList : [])
      setSelectedExerciseIds([...new Set(activeSets.map((set) => set.exerciseId).filter(Boolean))])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!restEndsAt) return undefined
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [restEndsAt])

  const groups = useMemo(() => selectedExerciseIds.map((exerciseId) => ({
    exerciseId,
    exercise: exercises.find((exercise) => exercise.id === exerciseId),
    sets: sets.filter((set) => set.exerciseId === exerciseId),
  })), [exercises, selectedExerciseIds, sets])

  function draftFor(group) {
    if (drafts[group.exerciseId]) return drafts[group.exerciseId]
    const next = createNextSet(group.sets)
    return { weight: next.weight || '', reps: next.reps || '' }
  }

  async function startWorkout() {
    setError('')
    try {
      const active = await api.post('/workout/sessions/start', {})
      setSession(active)
      setSets([])
      setSelectedExerciseIds([])
    } catch (nextError) {
      setError(nextError.message || 'The workout could not be started')
    }
  }

  function addExercise() {
    if (!exerciseToAdd || selectedExerciseIds.includes(exerciseToAdd)) return
    setSelectedExerciseIds((current) => [...current, exerciseToAdd])
    setDrafts((current) => ({ ...current, [exerciseToAdd]: { weight: '', reps: '' } }))
    setExerciseToAdd('')
  }

  function completeSet(group) {
    const draft = draftFor(group)
    const optimisticId = `pending-${Date.now()}`
    const optimistic = completeSetOptimistically({
      id: optimisticId,
      exerciseId: group.exerciseId,
      weight: Number(draft.weight || 0) || null,
      reps: Number(draft.reps || 0) || null,
      completed: true,
    }).current

    setSavingExerciseId(group.exerciseId)
    setSets((current) => [...current, optimistic])
    updateApiCache('/workout/sessions/active', (current) => ({
      ...current,
      sets: [...(current?.sets || []), optimistic],
    }))
    setError('')
    const mutation = queueApiMutation(`/workout/sets/session/${session.id}/add`, {
      method: 'POST',
      body: {
        exerciseId: group.exerciseId,
        weight: optimistic.weight,
        reps: optimistic.reps,
      },
      prefixes: ['/workout', '/dashboard'],
    })
    setSavingExerciseId(null)
    setRestEndsAt(Date.now() + 90_000)
    setNow(Date.now())
    mutation.committed.then((saved) => {
      const completed = { ...saved, completed: true }
      setSets((current) => current.map((set) => set.id === optimisticId ? completed : set))
      updateApiCache('/workout/sessions/active', (current) => ({
        ...current,
        sets: (current?.sets || []).map((set) => set.id === optimisticId ? completed : set),
      }))
      setUndoSet(completed)
    }).catch(() => {})
  }

  function undoLastSet() {
    if (!undoSet) return
    const target = undoSet
    setUndoSet(null)
    setSets((current) => current.filter((set) => set.id !== target.id))
    updateApiCache('/workout/sessions/active', (current) => ({
      ...current,
      sets: (current?.sets || []).filter((set) => set.id !== target.id),
    }))
    setDrafts((current) => ({ ...current, [target.exerciseId]: { weight: target.weight || '', reps: target.reps || '' } }))
    queueApiMutation(`/workout/sets/${target.id}`, {
      method: 'DELETE',
      prefixes: ['/workout', '/dashboard'],
    })
  }

  function finishWorkout() {
    if (!session || finishing) return
    setFinishing(true)
    setError('')
    queueApiMutation(`/workout/sessions/${session.id}/end`, {
      method: 'PATCH',
      body: {},
      prefixes: ['/workout', '/dashboard'],
    })
    navigate('/workout/history')
  }

  if (loading) return <StatePanel kind="loading" title="Opening active workout" detail="Sets already saved will appear first." />

  if (!session) {
    return (
      <div className="record-gym-active">
        <PageHeading eyebrow="Gym · Active workout" title="Ready when you are"><p>Start an empty session, choose the first exercise, and log each set without leaving the screen.</p></PageHeading>
        {error && <StatePanel kind="error" title="Workout unavailable" detail={error} />}
        <StatePanel kind="empty" title="No active workout" detail="Starting creates an empty session and keeps you on this workbench." action={<button type="button" className="record-button record-button--primary" onClick={startWorkout}>Start workout</button>} />
      </div>
    )
  }

  const restSeconds = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0

  return (
    <div className="record-gym-active" data-testid="gym-active-workbench">
      <PageHeading
        eyebrow={`Active workout · ${durationLabel(session.startAt)}`}
        title={session.title || 'Training session'}
        actions={<><button type="button" className="record-button" onClick={() => navigate('/workout')}>Leave open</button><button type="button" className="record-button record-button--primary" onClick={() => setFinishConfirmationOpen(true)}>Finish</button></>}
      ><p>{sets.length} completed {sets.length === 1 ? 'set' : 'sets'} in this session.</p></PageHeading>

      {error && <StatePanel kind="error" title="The last workout action failed" detail={error} />}
      <div className={`record-gym-rest${restSeconds > 0 ? ' is-running' : ''}`} role="timer" aria-label="Rest timer">
        <span>{restEndsAt ? 'Rest timer' : 'Complete a set to start 90 seconds'}</span>
        <strong>{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, '0')}</strong>
      </div>

      <div className="record-gym-exercise-list">
        {groups.map((group) => (
          <ExerciseBlock
            key={group.exerciseId}
            draft={draftFor(group)}
            exercise={group.exercise}
            onComplete={() => completeSet(group)}
            onDraftChange={(draft) => setDrafts((current) => ({ ...current, [group.exerciseId]: draft }))}
            saving={savingExerciseId === group.exerciseId}
            sets={group.sets}
          />
        ))}
      </div>

      <div className="record-gym-add-exercise">
        <select value={exerciseToAdd} onChange={(event) => setExerciseToAdd(event.target.value)} aria-label="Exercise to add">
          <option value="">Choose an exercise</option>
          {exercises.filter((exercise) => !selectedExerciseIds.includes(exercise.id)).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
        </select>
        <button type="button" className="record-button" onClick={addExercise} disabled={!exerciseToAdd}>Add exercise</button>
      </div>

      {undoSet && <div className="record-gym-undo" role="status"><span>Set saved</span><button type="button" onClick={undoLastSet}>Undo</button></div>}

      {finishConfirmationOpen && (
        <div className="modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !finishing && setFinishConfirmationOpen(false)}>
          <section className="record-confirmation" role="dialog" aria-modal="true" aria-labelledby="finish-workout-title">
            <Icon name="check-circle" size={22} />
            <div><h2 id="finish-workout-title">Finish and save?</h2><p>This closes the active session with {sets.length} completed {sets.length === 1 ? 'set' : 'sets'}. You can review it in History.</p></div>
            <footer><button type="button" className="record-button" onClick={() => setFinishConfirmationOpen(false)} disabled={finishing}>Keep training</button><button type="button" className="record-button record-button--primary" onClick={finishWorkout} disabled={finishing}>{finishing ? 'Saving…' : 'Finish and save'}</button></footer>
          </section>
        </div>
      )}
    </div>
  )
}
