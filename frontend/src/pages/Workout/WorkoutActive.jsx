import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { 
  LoadingSpinner, 
  LoadingLine, 
  SetRow, 
  Modal, 
  formatDuration,
  formatDateTime,
  calculateVolume,
  SkeletonCard
} from './WorkoutShared'

export default function WorkoutActive() {
  const { sidebarCollapsed } = useOutletContext() || {}
  const navigate = useNavigate()
  
  const [activeSession, setActiveSession] = useState(null)
  const [sets, setSets] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Add set modal state
  const [showAddSet, setShowAddSet] = useState(false)
  const [addSetForm, setAddSetForm] = useState({
    exerciseId: '',
    reps: '',
    weight: '',
    distance: '',
    durationSec: '',
    rpe: '',
    notes: ''
  })
  
  // End workout modal
  const [showEndModal, setShowEndModal] = useState(false)
  const [endForm, setEndForm] = useState({ title: '', notes: '' })

  useEffect(() => {
    loadActiveSession()
    loadExercises()
  }, [])

  async function loadActiveSession() {
    setLoading(true)
    setError('')
    try {
      // Get active session
      const session = await api.get('/workout/sessions/active')
      if (session) {
        setActiveSession(session)
        setSets((session.sets || []).sort((a, b) => a.order - b.order))
      }
    } catch (e) {
      setError(e.message || 'Failed to load active session')
    } finally {
      setLoading(false)
    }
  }

  async function loadExercises() {
    try {
  const ex = await api.get('/workout/exercises')
  setExercises(ex || [])
    } catch (e) {
      console.error('Failed to load exercises:', e)
    }
  }

  async function startWorkout() {
    setError('')
    try {
      const session = await api.post('/workout/sessions/start', {})
      setActiveSession(session)
      setSets([])
    } catch (e) {
      setError(e.message || 'Failed to start workout')
    }
  }

  async function addSet() {
    if (!activeSession) return
    setError('')
    try {
      const payload = {
        exerciseId: addSetForm.exerciseId || null,
        reps: addSetForm.reps ? Number(addSetForm.reps) : null,
        weight: addSetForm.weight ? Number(addSetForm.weight) : null,
        distance: addSetForm.distance ? Number(addSetForm.distance) : null,
        durationSec: addSetForm.durationSec ? Number(addSetForm.durationSec) : null,
        rpe: addSetForm.rpe ? Number(addSetForm.rpe) : null,
        notes: addSetForm.notes || null
      }
      
      const newSet = await api.post(`/workout/sets/session/${activeSession.id}/add`, payload)
      setSets([...sets, newSet])
      
      // Reset form and close modal
      setAddSetForm({
        exerciseId: '',
        reps: '',
        weight: '',
        distance: '',
        durationSec: '',
        rpe: '',
        notes: ''
      })
      setShowAddSet(false)
    } catch (e) {
      setError(e.message || 'Failed to add set')
    }
  }

  async function deleteSet(set) {
    if (!window.confirm('Delete this set?')) return
    setError('')
    try {
      await api.post(`/workout/sets/${set.id}`, { method: 'DELETE' })
      setSets(sets.filter(s => s.id !== set.id))
    } catch (e) {
      setError(e.message || 'Failed to delete set')
    }
  }

  async function endWorkout() {
    if (!activeSession) return
    setError('')
    try {
      const updated = await api.post(`/workout/sessions/${activeSession.id}/end`, {
        title: endForm.title || null,
        notes: endForm.notes || null
      })
      
      setActiveSession(null)
      setSets([])
      setShowEndModal(false)
      setEndForm({ title: '', notes: '' })
      
      // Navigate to history
      navigate('/workout/history')
    } catch (e) {
      setError(e.message || 'Failed to end workout')
    }
  }

  const volume = calculateVolume(sets)
  const duration = activeSession ? formatDuration(activeSession.startAt, null) : '—'
  const uniqueExercises = new Set(sets.filter(s => s.exerciseId).map(s => s.exerciseId)).size

  return (
    <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
      <h1>💪 Active Workout</h1>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.5)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div>
          {/* Session info skeleton */}
          <SkeletonCard lines={3} widths={["40%","30%","60%"]} />
          {/* Sets skeleton */}
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '.75rem' }}>Sets</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card" style={{ padding: '.75rem' }}>
                  <LoadingLine width={"70%"} />
                  <LoadingLine width={"50%"} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !activeSession ? (
        <div>
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏋️</div>
            <h2 style={{ marginBottom: '1rem' }}>No active workout</h2>
            <p style={{ opacity: .7, marginBottom: '2rem' }}>Start a new workout to begin tracking your sets</p>
            <button className="btn" onClick={startWorkout}>
              Start Workout
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Session info card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {activeSession.title || 'Workout Session'}
                </div>
                <div style={{ opacity: .7, fontSize: '.9rem', marginTop: 4 }}>
                  Started: {formatDateTime(activeSession.startAt)}
                </div>
              </div>
              <div style={{ 
                padding: '6px 14px', 
                background: 'rgba(251,191,36,0.2)', 
                color: '#fbbf24',
                borderRadius: 8,
                fontWeight: 700
              }}>
                {duration}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <div style={{ opacity: .7, fontSize: '.85rem' }}>Sets</div>
                <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{sets.length}</div>
              </div>
              <div>
                <div style={{ opacity: .7, fontSize: '.85rem' }}>Exercises</div>
                <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{uniqueExercises}</div>
              </div>
              <div>
                <div style={{ opacity: .7, fontSize: '.85rem' }}>Volume</div>
                <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{volume > 0 ? `${volume.toFixed(0)} kg` : '—'}</div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '.75rem' }}>
              <button className="btn" onClick={() => setShowAddSet(true)}>
                ➕ Add Set
              </button>
              <button 
                className="btn" 
                onClick={() => setShowEndModal(true)}
                style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}
              >
                ✓ End Workout
              </button>
            </div>
          </div>

          {/* Sets list */}
          <div>
            <h3 style={{ marginBottom: '.75rem' }}>Sets</h3>
            {sets.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', opacity: .7 }}>
                No sets yet. Click "Add Set" to get started.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {sets.map((set, idx) => {
                  const exercise = exercises.find(e => e.id === set.exerciseId)
                  return (
                    <SetRow 
                      key={set.id} 
                      set={set} 
                      exercise={exercise}
                      onDelete={deleteSet}
                      showOrder
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Set Modal */}
      {showAddSet && (
        <Modal title="Add Set" onClose={() => setShowAddSet(false)} size="medium">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Exercise
              </label>
              <select 
                className="input"
                value={addSetForm.exerciseId}
                onChange={(e) => setAddSetForm({ ...addSetForm, exerciseId: e.target.value })}
              >
                <option value="">— Select Exercise —</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                  Reps
                </label>
                <input 
                  type="number"
                  className="input"
                  placeholder="e.g. 10"
                  value={addSetForm.reps}
                  onChange={(e) => setAddSetForm({ ...addSetForm, reps: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                  Weight (kg)
                </label>
                <input 
                  type="number"
                  step="0.5"
                  className="input"
                  placeholder="e.g. 60"
                  value={addSetForm.weight}
                  onChange={(e) => setAddSetForm({ ...addSetForm, weight: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                  Distance (m)
                </label>
                <input 
                  type="number"
                  className="input"
                  placeholder="e.g. 5000"
                  value={addSetForm.distance}
                  onChange={(e) => setAddSetForm({ ...addSetForm, distance: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                  Duration (sec)
                </label>
                <input 
                  type="number"
                  className="input"
                  placeholder="e.g. 60"
                  value={addSetForm.durationSec}
                  onChange={(e) => setAddSetForm({ ...addSetForm, durationSec: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                RPE (1-10)
              </label>
              <input 
                type="number"
                min="1"
                max="10"
                className="input"
                placeholder="e.g. 8"
                value={addSetForm.rpe}
                onChange={(e) => setAddSetForm({ ...addSetForm, rpe: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Notes
              </label>
              <textarea 
                className="input"
                rows={3}
                placeholder="Any notes about this set..."
                value={addSetForm.notes}
                onChange={(e) => setAddSetForm({ ...addSetForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button className="btn" onClick={addSet}>
                Add Set
              </button>
              <button className="btn" onClick={() => setShowAddSet(false)} style={{ background: 'rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* End Workout Modal */}
      {showEndModal && (
        <Modal title="End Workout" onClose={() => setShowEndModal(false)} size="medium">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Title (optional)
              </label>
              <input 
                type="text"
                className="input"
                placeholder="e.g. Leg Day"
                value={endForm.title}
                onChange={(e) => setEndForm({ ...endForm, title: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
                Notes (optional)
              </label>
              <textarea 
                className="input"
                rows={4}
                placeholder="How did the workout go..."
                value={endForm.notes}
                onChange={(e) => setEndForm({ ...endForm, notes: e.target.value })}
              />
            </div>

            <div className="card" style={{ background: 'rgba(125,211,252,0.1)', padding: '1rem' }}>
              <div style={{ fontSize: '.9rem', opacity: .9, marginBottom: '.5rem' }}>Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem' }}>
                <div>
                  <div style={{ fontSize: '.8rem', opacity: .7 }}>Duration</div>
                  <div style={{ fontWeight: 700 }}>{duration}</div>
                </div>
                <div>
                  <div style={{ fontSize: '.8rem', opacity: .7 }}>Sets</div>
                  <div style={{ fontWeight: 700 }}>{sets.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '.8rem', opacity: .7 }}>Volume</div>
                  <div style={{ fontWeight: 700 }}>{volume > 0 ? `${volume.toFixed(0)} kg` : '—'}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button 
                className="btn" 
                onClick={endWorkout}
                style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}
              >
                ✓ Finish & Save
              </button>
              <button className="btn" onClick={() => setShowEndModal(false)} style={{ background: 'rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
