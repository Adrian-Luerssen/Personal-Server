import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../../api'
import Icon from '../../components/icons/Icon'
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
      setError(nextError.message || 'Could not start the workout')
    }
  }

  function addExercise() {
    if (!exerciseToAdd || selectedExerciseIds.includes(exerciseToAdd)) return
    setSelectedExerciseIds((current) => [...current, exerciseToAdd])
    setDrafts((current) => ({ ...current, [exerciseToAdd]: { weight: '', reps: '' } }))
    setExerciseToAdd('')
  }

  async function completeSet(group) {
    const draft = draftFor(group)
    const optimisticId = `pending-${Date.now()}`
    const optimistic = completeSetOptimistically({
      id: optimisticId,
      exerciseId: group.exerciseId,
      weight: Number(draft.weight || 0) || null,
      reps: Number(draft.reps || 0) || null,
      completed: false,
    }).current

    setSavingExerciseId(group.exerciseId)
    setSets((current) => [...current, optimistic])
    setDrafts((current) => ({ ...current, [group.exerciseId]: { weight: draft.weight, reps: draft.reps } }))
    try {
      const saved = await api.post(`/workout/sets/session/${session.id}/add`, {
        exerciseId: group.exerciseId,
        weight: optimistic.weight,
        reps: optimistic.reps,
      })
      const completed = { ...saved, completed: true }
      setSets((current) => current.map((set) => set.id === optimisticId ? completed : set))
      setUndoSet(completed)
      setRestEndsAt(Date.now() + 90_000)
      setNow(Date.now())
    } catch (nextError) {
      setSets((current) => current.filter((set) => set.id !== optimisticId))
      setError(nextError.message || 'Could not save the set. Your values are still in the row.')
    } finally {
      setSavingExerciseId(null)
    }
  }

  async function undoLastSet() {
    if (!undoSet) return
    const target = undoSet
    setUndoSet(null)
    setSets((current) => current.filter((set) => set.id !== target.id))
    setDrafts((current) => ({ ...current, [target.exerciseId]: { weight: target.weight || '', reps: target.reps || '' } }))
    await api.delete(`/workout/sets/${target.id}`).catch(() => {
      setSets((current) => [...current, target])
      setError('Could not undo the set.')
    })
  }

  async function finishWorkout() {
    if (!session || !window.confirm('Finish and save this workout?')) return
    try {
      await api.patch(`/workout/sessions/${session.id}/end`, {})
      navigate('/workout/history')
    } catch (nextError) {
      setError(nextError.message || 'Could not finish the workout')
    }
  }

  if (loading) return <div className="gym-active-page"><p>Opening active workout…</p></div>

  if (!session) {
    return (
      <div className="gym-active-page">
        {error ? <div className="alert-error">{error}</div> : null}
        <section className="gym-empty">
          <div>
            <Icon name="dumbbell" size={32} />
            <h1>Ready when you are.</h1>
            <p>Start an empty session, choose the first exercise, and log each set without leaving the screen.</p>
            <button type="button" onClick={startWorkout}>Start workout</button>
          </div>
        </section>
      </div>
    )
  }

  const restSeconds = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0

  return (
    <div className="gym-active-page">
      <header className="gym-active-header">
        <div>
          <span>Active workout · {durationLabel(session.startAt)}</span>
          <h1>{session.title || 'Training session'}</h1>
        </div>
        <div className="gym-session-actions">
          <button type="button" onClick={() => navigate('/workout')}>Leave open</button>
          <button type="button" onClick={finishWorkout}>Finish</button>
        </div>
      </header>

      {error ? <div className="alert-error">{error}</div> : null}
      <div className="gym-rest-timer" role="timer" aria-label="Rest timer">
        <span>{restEndsAt ? 'Rest timer' : 'Set complete starts a 90 second rest'}</span>
        <strong>{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, '0')}</strong>
      </div>

      <div className="gym-exercise-list">
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

      <div className="gym-add-exercise">
        <select value={exerciseToAdd} onChange={(event) => setExerciseToAdd(event.target.value)} aria-label="Exercise to add">
          <option value="">Choose an exercise</option>
          {exercises.filter((exercise) => !selectedExerciseIds.includes(exercise.id)).map((exercise) => (
            <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
          ))}
        </select>
        <button type="button" onClick={addExercise} disabled={!exerciseToAdd}>Add exercise</button>
      </div>

      {undoSet ? (
        <div className="gym-undo" role="status">
          <span>Set saved</span>
          <button type="button" onClick={undoLastSet}>Undo</button>
        </div>
      ) : null}
    </div>
  )
}
