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
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Add set modal state
  const [showAddSet, setShowAddSet] = useState(false)
  const [addSetForm, setAddSetForm] = useState({
    categoryId: '',
    exerciseId: '',
    reps: '',
    weight: '',
    distance: '',
    durationSec: '',
    rpe: '',
    notes: ''
  })
  const [addSetTab, setAddSetTab] = useState('add') // 'add' | 'history'
  const [exerciseHistory, setExerciseHistory] = useState([])
  const [lastSet, setLastSet] = useState(null)
  
  // End workout modal
  const [showEndModal, setShowEndModal] = useState(false)
  const [endForm, setEndForm] = useState({ title: '', notes: '' })


  useEffect(() => {
    loadActiveSession()
    loadExercises()
    loadCategories()
  }, [])

  // When exercise changes, fetch last set and history
  useEffect(() => {
    if (addSetForm.exerciseId) {
      fetchExerciseHistory(addSetForm.exerciseId)
    } else {
      setExerciseHistory([])
      setLastSet(null)
    }
  }, [addSetForm.exerciseId])
  async function loadCategories() {
    try {
      const cat = await api.get('/workout/categories')
      setCategories(cat || [])
    } catch (e) {
      // ignore
    }
  }

  async function fetchExerciseHistory(exerciseId) {
    try {
      // Get all sets for this exercise, most recent first
      const data = await api.get(`/workout/exercises/history/${exerciseId}`)
      setExerciseHistory(data || [])
      setLastSet((data && data.length > 0) ? data[0] : null)
    } catch (e) {
      setExerciseHistory([])
      setLastSet(null)
    }
  }

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
        categoryId: '',
        exerciseId: '',
        reps: '',
        weight: '',
        distance: '',
        durationSec: '',
        rpe: '',
        notes: ''
      })
      setAddSetTab('add')
      setShowAddSet(false)
    } catch (e) {
      setError(e.message || 'Failed to add set')
    }
  }

  async function deleteSet(set) {
    if (!window.confirm('Delete this set?')) return
    setError('')
    try {
      await api.delete(`/workout/sets/${set.id}`)
      setSets(sets.filter(s => s.id !== set.id))
    } catch (e) {
      setError(e.message || 'Failed to delete set')
    }
  }

  async function endWorkout() {
    if (!activeSession) return
    setError('')
    try {
      const updated = await api.patch(`/workout/sessions/${activeSession.id}/end`, {
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
      <h1><span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '8px' }}>fitness_center</span>Active Workout</h1>

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
            <span className="material-icons" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#7dd3fc' }}>fitness_center</span>
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
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '4px', fontSize: '18px' }}>add</span>
                Add Set
              </button>
              <button 
                className="btn" 
                onClick={() => setShowEndModal(true)}
                style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}
              >
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '4px', fontSize: '18px' }}>check</span>
                End Workout
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Group sets by exerciseId */}
                {Object.entries(
                  sets.reduce((acc, set) => {
                    if (!acc[set.exerciseId]) acc[set.exerciseId] = [];
                    acc[set.exerciseId].push(set);
                    return acc;
                  }, {})
                ).map(([exerciseId, setsForExercise]) => {
                  const exercise = exercises.find(e => e.id === exerciseId);
                  return (
                    <div key={exerciseId} style={{ background: 'rgba(125,211,252,0.04)', borderRadius: 8, padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{exercise ? exercise.name : 'Unknown Exercise'}</div>
                        <button
                          className="btn"
                          style={{ background: '#7dd3fc', color: '#0a1929', fontWeight: 600, fontSize: '.95rem', padding: '4px 12px' }}
                          onClick={() => {
                            // Find last set for this exercise in the current session
                            const last = setsForExercise.length > 0 ? setsForExercise[setsForExercise.length - 1] : null;
                            setAddSetForm(f => ({
                              ...f,
                              categoryId: exercise ? exercise.categoryId : '',
                              exerciseId: exerciseId,
                              reps: last?.reps?.toString() || '',
                              weight: last?.weight?.toString() || '',
                              distance: last?.distance?.toString() || '',
                              durationSec: last?.durationSec?.toString() || '',
                              rpe: last?.rpe?.toString() || '',
                              notes: last?.notes || ''
                            }));
                            setShowAddSet(true);
                          }}
                        >
                          + Add Set
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                        {setsForExercise.map((set, i) => (
                          <SetRow
                            key={set.id}
                            set={set}
                            exercise={exercise}
                            onDelete={deleteSet}
                            showOrder
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Set Modal */}
      {showAddSet && (
        <Modal title="Add Set" onClose={() => setShowAddSet(false)} size="large">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Step 1: Category selection */}
            {!addSetForm.categoryId && (
              <>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Select a Category</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      className="card"
                      style={{ cursor: 'pointer', borderLeft: `4px solid ${cat.color || '#7dd3fc'}`, background: `${cat.color || '#7dd3fc'}08` }}
                      onClick={() => setAddSetForm(f => ({ ...f, categoryId: cat.id, exerciseId: '' }))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: cat.color || '#7dd3fc' }} />
                        <span style={{ fontWeight: 700, color: cat.color || '#7dd3fc' }}>{cat.name}</span>
                      </div>
                      {cat.description && <div style={{ fontSize: '.85rem', opacity: .7, marginTop: 4 }}>{cat.description}</div>}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16 }}>
                  <button className="btn" onClick={() => setShowAddSet(false)} style={{ background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
                </div>
              </>
            )}

            {/* Step 2: Exercise selection */}
            {addSetForm.categoryId && !addSetForm.exerciseId && (
              <>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Select an Exercise</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  {exercises.filter(ex => ex.categoryId === addSetForm.categoryId).map(ex => (
                    <div
                      key={ex.id}
                      className="card"
                      style={{ cursor: 'pointer', borderLeft: `4px solid ${categories.find(c => c.id === addSetForm.categoryId)?.color || '#7dd3fc'}` }}
                      onClick={() => setAddSetForm(f => ({ ...f, exerciseId: ex.id }))}
                    >
                      <div style={{ fontWeight: 700 }}>{ex.name}</div>
                      {ex.muscleGroup && <div style={{ fontSize: '.85rem', opacity: .7, marginTop: 4 }}>{ex.muscleGroup}</div>}
                      {ex.notes && <div style={{ fontSize: '.85rem', opacity: .6, marginTop: 6, fontStyle: 'italic' }}>{ex.notes}</div>}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16 }}>
                  <button className="btn" onClick={() => setAddSetForm(f => ({ ...f, categoryId: '', exerciseId: '' }))} style={{ background: 'rgba(255,255,255,0.1)' }}>Back</button>
                </div>
              </>
            )}

            {/* Step 3: Set entry and history */}
            {addSetForm.categoryId && addSetForm.exerciseId && (
              <>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '.5rem' }}>
                  <button className="btn" style={{ fontWeight: addSetTab === 'add' ? 700 : 400, background: addSetTab === 'add' ? '#7dd3fc' : 'rgba(125,211,252,0.1)', color: addSetTab === 'add' ? '#0a1929' : undefined }} onClick={() => setAddSetTab('add')}>Add Set</button>
                  <button className="btn" style={{ fontWeight: addSetTab === 'history' ? 700 : 400, background: addSetTab === 'history' ? '#7dd3fc' : 'rgba(125,211,252,0.1)', color: addSetTab === 'history' ? '#0a1929' : undefined }} onClick={() => setAddSetTab('history')}>History</button>
                </div>

                {addSetTab === 'add' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>Reps</label>
                        <input
                          type="number"
                          className="input"
                          placeholder="e.g. 10"
                          value={addSetForm.reps}
                          onChange={e => setAddSetForm(f => ({ ...f, reps: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>Weight (kg)</label>
                        <input
                          type="number"
                          step="0.5"
                          className="input"
                          placeholder="e.g. 60"
                          value={addSetForm.weight}
                          onChange={e => setAddSetForm(f => ({ ...f, weight: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>Distance (m)</label>
                        <input
                          type="number"
                          className="input"
                          placeholder="e.g. 5000"
                          value={addSetForm.distance}
                          onChange={e => setAddSetForm(f => ({ ...f, distance: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>Duration (sec)</label>
                        <input
                          type="number"
                          className="input"
                          placeholder="e.g. 60"
                          value={addSetForm.durationSec}
                          onChange={e => setAddSetForm(f => ({ ...f, durationSec: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>RPE (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="input"
                        placeholder="e.g. 8"
                        value={addSetForm.rpe}
                        onChange={e => setAddSetForm(f => ({ ...f, rpe: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>Notes</label>
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Any notes about this set..."
                        value={addSetForm.notes}
                        onChange={e => setAddSetForm(f => ({ ...f, notes: e.target.value }))}
                      />
                    </div>

                    {/* Last set summary */}
                    {lastSet && (
                      <div className="card" style={{ background: 'rgba(125,211,252,0.08)', marginTop: '1rem', padding: '1rem' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Last Set</div>
                        <div style={{ fontSize: '.95rem', opacity: .85 }}>
                          {lastSet.weight ? `${lastSet.weight} kg × ` : ''}{lastSet.reps ? `${lastSet.reps} reps` : ''}
                          {lastSet.distance ? ` • ${lastSet.distance} m` : ''}
                          {lastSet.durationSec ? ` • ${lastSet.durationSec} sec` : ''}
                          {lastSet.rpe ? ` • RPE ${lastSet.rpe}` : ''}
                        </div>
                        <div style={{ fontSize: '.85rem', opacity: .7, marginTop: 2 }}>{lastSet.date ? new Date(lastSet.date).toLocaleString() : ''}</div>
                        {lastSet.notes && <div style={{ fontSize: '.85rem', opacity: .7, marginTop: 2, fontStyle: 'italic' }}>{lastSet.notes}</div>}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
                      <button className="btn" onClick={addSet}>
                        Add Set
                      </button>
                      <button className="btn" onClick={() => setAddSetForm(f => ({ ...f, exerciseId: '' }))} style={{ background: 'rgba(255,255,255,0.1)' }}>
                        Back
                      </button>
                    </div>
                  </>
                )}

                {/* History Tab */}
                {addSetTab === 'history' && (
                  <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                    {exerciseHistory.length === 0 ? (
                      <div style={{ opacity: .7, textAlign: 'center', padding: '2rem' }}>No history for this exercise.</div>
                    ) : (
                      <table style={{ width: '100%', fontSize: '.97rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(125,211,252,0.2)' }}>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>Date</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>Weight</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>Reps</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>Distance</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>Duration</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>RPE</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exerciseHistory.map((set, i) => (
                            <tr key={set.id || i} style={{ borderBottom: '1px solid rgba(125,211,252,0.08)' }}>
                              <td style={{ padding: '6px 4px' }}>{set.date ? new Date(set.date).toLocaleString() : ''}</td>
                              <td style={{ padding: '6px 4px' }}>{set.weight ?? ''}</td>
                              <td style={{ padding: '6px 4px' }}>{set.reps ?? ''}</td>
                              <td style={{ padding: '6px 4px' }}>{set.distance ?? ''}</td>
                              <td style={{ padding: '6px 4px' }}>{set.durationSec ?? ''}</td>
                              <td style={{ padding: '6px 4px' }}>{set.rpe ?? ''}</td>
                              <td style={{ padding: '6px 4px', fontStyle: 'italic', opacity: .7 }}>{set.notes ?? ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
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
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '4px', fontSize: '18px' }}>check</span>
                Finish & Save
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
