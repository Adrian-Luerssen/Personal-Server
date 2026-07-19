import React, { useEffect, useState, useRef } from 'react'
import { api } from '../../api'
import {
  LoadingSpinner,
  LoadingLine,
  SessionCard,
  Modal,
  SkeletonSessionCard,
  formatDate,
  formatDateTime,
  formatSessionDuration,
  calculateVolume,
  formatNumberShort,
} from '../../components/shared'
import Icon from '../../components/icons/Icon'
import ScrollReveal from '../../components/ScrollReveal'
import PageHeader from '../../components/PageHeader'
import InlineConfirmation from '../../components/record/InlineConfirmation'

export default function WorkoutHistory() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isPreloading, setIsPreloading] = useState(false)

  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [totalSets, setTotalSets] = useState(0)
  const [totalReps, setTotalReps] = useState(0)
  const [totalVolume, setTotalVolume] = useState(0)
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(0)

  const [selectedSession, setSelectedSession] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [exercises, setExercises] = useState([])
  const [editingSet, setEditingSet] = useState(null)
  const [setForm, setSetForm] = useState({})
  const [savingSet, setSavingSet] = useState(false)
  const [editSetError, setEditSetError] = useState('')

  const [dateFilter, setDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const observerRef = useRef(null)
  const loadMoreRef = useRef(null)

  useEffect(() => { loadSessions(1, true); loadExercises() }, [dateFilter])

  useEffect(() => {
    if (!loadMoreRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !isPreloading && !searchTerm && !dateFilter) {
          loadSessions(page + 1, false)
        }
      },
      { threshold: 0.5, rootMargin: '200px' }
    )
    observer.observe(loadMoreRef.current)
    observerRef.current = observer
    return () => { if (observerRef.current) observerRef.current.disconnect() }
  }, [hasMore, loading, isPreloading, page, searchTerm, dateFilter])

  async function loadSessions(pageNum = 1, reset = false) {
    if (reset) setLoading(true)
    setError('')
    try {
      const data = await api.get(`/workout/sessions?page=${pageNum}&limit=10`)
      const newSessions = data.sessions || []

      if (data.totalWorkouts !== undefined) setTotalWorkouts(formatNumberShort(data.totalWorkouts))
      if (data.totalSets !== undefined) setTotalSets(formatNumberShort(data.totalSets))
      if (data.totalReps !== undefined) setTotalReps(formatNumberShort(data.totalReps))
      if (data.totalVolume !== undefined) setTotalVolume(formatNumberShort(data.totalVolume))
      if (data.totalTimeSeconds !== undefined) setTotalTimeSeconds(data.totalTimeSeconds)

      if (reset) setSessions(newSessions)
      else setSessions(prev => [...prev, ...newSessions])
      setPage(pageNum)
      setHasMore(newSessions.length === 10)
      if (newSessions.length === 10 && !isPreloading) preloadNextPage(pageNum + 1)
    } catch (e) { setError(e.message || 'Failed to load sessions') }
    finally { if (reset) setLoading(false) }
  }

  async function preloadNextPage(nextPage) {
    setIsPreloading(true)
    try { await api.get(`/workout/sessions?page=${nextPage}&limit=10`) } catch {}
    finally { setIsPreloading(false) }
  }

  async function loadExercises() {
    try { setExercises(await api.get('/workout/exercises') || []) } catch {}
  }

  function openDetail(session) { setSelectedSession(session); setShowDetail(true) }
  function closeDetail() { setShowDetail(false); setSelectedSession(null); setConfirmingDelete(false); setEditingSet(null) }

  function openSetEditor(set, exercise, displayOrder) {
    setEditingSet({ ...set, exercise, displayOrder })
    setSetForm({
      weight: set.weight ?? '', reps: set.reps ?? '', distance: set.distance ?? '',
      durationSec: set.durationSec ?? '', rpe: set.rpe ?? '', notes: set.notes ?? '',
    })
    setEditSetError('')
  }

  async function saveSet(event) {
    event.preventDefault()
    if (!editingSet || savingSet) return
    setSavingSet(true)
    setEditSetError('')
    const numberOrNull = (value) => value === '' ? null : Number(value)
    try {
      const updated = await api.patch(`/workout/sets/${editingSet.id}`, {
        weight: numberOrNull(setForm.weight), reps: numberOrNull(setForm.reps),
        distance: numberOrNull(setForm.distance), durationSec: numberOrNull(setForm.durationSec),
        rpe: numberOrNull(setForm.rpe), notes: String(setForm.notes || '').trim() || null,
      })
      const merge = (session) => ({ ...session, sets: (session.sets || []).map((set) => set.id === updated.id ? { ...set, ...updated } : set) })
      setSelectedSession((session) => merge(session))
      setSessions((items) => items.map((session) => session.id === selectedSession.id ? merge(session) : session))
      setEditingSet(null)
    } catch (e) {
      setEditSetError(e.message || 'Could not save this set')
    } finally {
      setSavingSet(false)
    }
  }

  async function deleteSession(sessionId) {
    setError('')
    try { await api.delete(`/workout/sessions/${sessionId}`); setSessions(sessions.filter(s => s.id !== sessionId)); closeDetail(); loadSessions(1, true) }
    catch (e) { setError(e.message || 'Failed to delete session') }
  }

  let filteredSessions = sessions
  if (dateFilter) filteredSessions = filteredSessions.filter(s => s.date === dateFilter)
  filteredSessions = filteredSessions.filter(s => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (s.title || '').toLowerCase().includes(term) || (s.notes || '').toLowerCase().includes(term) || formatDate(s.startAt).toLowerCase().includes(term)
  })

  return (
    <>
      <PageHeader title="Workout History" />

      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <ScrollReveal>
        <dl className="workout-history-summary" aria-label="All-time training summary">
          {loading && page === 1 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div className={i < 2 ? 'workout-history-summary__primary' : 'workout-history-summary__secondary'} key={i}>
                <LoadingLine width="54%" />
                <LoadingLine width="72%" />
              </div>
            ))
          ) : (
            <>
              <div className="workout-history-summary__primary">
                <dt>Workouts</dt>
                <dd>{totalWorkouts}</dd>
              </div>
              <div className="workout-history-summary__primary">
                <dt>Training time</dt>
                <dd>{totalTimeSeconds > 0 ? `${Math.floor(totalTimeSeconds / 3600)}h ${Math.floor((totalTimeSeconds % 3600) / 60)}m` : '—'}</dd>
              </div>
              <div className="workout-history-summary__secondary">
                <dt>Sets</dt>
                <dd>{totalSets}</dd>
              </div>
              <div className="workout-history-summary__secondary">
                <dt>Reps</dt>
                <dd>{totalReps}</dd>
              </div>
              <div className="workout-history-summary__secondary">
                <dt>Volume</dt>
                <dd>{totalVolume}<small> kg</small></dd>
              </div>
            </>
          )}
        </dl>
      </ScrollReveal>

      <ScrollReveal delay={100}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-grid workout-history-filters">
          <div>
            <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>Search</label>
            <input type="text" className="input" aria-label="Search workout history" placeholder="Search title, notes, date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>Filter by Date</label>
            <input type="date" className="input" aria-label="Filter workout history by date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
        </div>
        {(searchTerm || dateFilter) && (
          <button className="btn small" onClick={() => { setSearchTerm(''); setDateFilter('') }} style={{ marginTop: '.75rem' }}>Clear Filters</button>
        )}
      </div>
      </ScrollReveal>

      <ScrollReveal delay={200}>
      {loading && page === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonSessionCard key={i} />)}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Icon name="inbox" size={48} style={{ marginBottom: '1rem', color: 'var(--color-accent)' }} />
          <h3>No workouts found</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '.5rem' }}>
            {searchTerm || dateFilter ? 'Try adjusting your filters' : 'Start tracking to see your history here'}
          </p>
        </div>
      ) : (
        <div>
          <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredSessions.map(session => <SessionCard key={session.id} session={session} onClick={() => openDetail(session)} />)}
          </div>
          {hasMore && !searchTerm && !dateFilter && (
            <div ref={loadMoreRef} style={{ textAlign: 'center', marginTop: '1.5rem', padding: '2rem', opacity: loading ? 0.6 : 0.3 }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '.5rem' }}>
                  <LoadingSpinner size={24} /><span>Loading more...</span>
                </div>
              ) : (
                <div style={{ fontSize: '.9rem' }}>Scroll for more workouts {isPreloading && '(preloading...)'}</div>
              )}
            </div>
          )}
          {!hasMore && sessions.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '.9rem' }}>
              <Icon name="check" size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              You've reached the end of your workout history
            </div>
          )}
        </div>
      )}
      </ScrollReveal>

      {showDetail && selectedSession && (
        <Modal title="Workout Details" onClose={closeDetail} size="large">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ marginBottom: '.5rem' }}>{selectedSession.title || formatDate(selectedSession.startAt)}</h3>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '.9rem' }}>
                {formatDateTime(selectedSession.startAt)}{selectedSession.endAt && ` — ${formatDateTime(selectedSession.endAt)}`}
              </div>
              <div style={{ display: 'inline-block', marginTop: '.5rem', padding: '4px 10px', background: selectedSession.endAt ? 'var(--color-success-muted)' : 'var(--color-warning-muted)', color: selectedSession.endAt ? 'var(--color-success)' : 'var(--color-warning)', borderRadius: 'var(--radius-sm)', fontSize: '.85rem', fontWeight: 600 }}>
                {selectedSession.endAt ? formatSessionDuration(selectedSession.startAt, selectedSession.endAt) : 'In Progress'}
              </div>
            </div>
            <div className="workout-detail-summary" aria-label="Workout totals">
              <div><span>Sets</span><strong>{(selectedSession.sets || []).length}</strong></div>
              <div><span>Exercises</span><strong>{new Set((selectedSession.sets || []).filter(s => s.exerciseId).map(s => s.exerciseId)).size}</strong></div>
              <div><span>Volume</span><strong>{calculateVolume(selectedSession.sets || []) > 0 ? `${calculateVolume(selectedSession.sets || []).toFixed(0)} kg` : '—'}</strong></div>
            </div>
            {selectedSession.notes && (
              <div className="card" style={{ background: 'var(--color-accent-muted)', padding: '1rem' }}>
                <div style={{ fontSize: '.85rem', color: 'var(--color-text-secondary)', marginBottom: '.5rem', fontWeight: 600 }}>Notes</div>
                <div style={{ fontSize: '.95rem' }}>{selectedSession.notes}</div>
              </div>
            )}
            <div className="workout-detail-ledger">
              <h4>Exercises</h4>
              {(selectedSession.sets || []).length === 0 ? (
                <div className="empty-state">No sets recorded</div>
              ) : (
                <div className="workout-detail-exercises">
                  {(() => {
                    const sortedSets = [...(selectedSession.sets || [])].sort((a, b) => a.order - b.order)
                    const grouped = sortedSets.reduce((acc, set) => { const id = set.exerciseId || 'unknown'; if (!acc[id]) acc[id] = []; acc[id].push(set); return acc }, {})
                    return Object.entries(grouped).map(([exerciseId, sets]) => {
                      const exercise = exercises.find(e => e.id === exerciseId) || sets[0]?.exercise
                      const category = exercise?.category || sets[0]?.category
                      return (
                        <section key={exerciseId} className="workout-exercise-ledger">
                          <header>
                            <div>
                              <h5>{exercise?.name || (exerciseId !== 'unknown' ? `Exercise ${exerciseId.slice(0, 8)}` : 'Unknown Exercise')}</h5>
                              <span>{category?.name || 'Exercise'}</span>
                            </div>
                            <small>{sets.length} {sets.length === 1 ? 'set' : 'sets'}</small>
                          </header>
                          <div className="workout-set-ledger__head" aria-hidden="true"><span>Set</span><span>Weight</span><span>Reps</span><span /></div>
                          <div className="workout-set-ledger">
                            {sets.map((set, idx) => (
                              <button type="button" className="workout-set-row" key={set.id} onClick={() => openSetEditor(set, exercise, idx + 1)} aria-label={`Edit ${exercise?.name || 'exercise'} set ${idx + 1}`}>
                                <span>{idx + 1}</span>
                                <strong>{set.weight != null ? `${set.weight} kg` : set.distance != null ? `${set.distance} m` : '—'}</strong>
                                <strong>{set.reps != null ? set.reps : set.durationSec != null ? `${set.durationSec}s` : '—'}</strong>
                                <Icon name="pencil" size={14} />
                              </button>
                            ))}
                          </div>
                        </section>
                      )
                    })
                  })()}
                </div>
              )}
            </div>
            {confirmingDelete ? (
              <InlineConfirmation
                message="Delete this workout and every set recorded in it?"
                confirmLabel="Delete workout"
                onCancel={() => setConfirmingDelete(false)}
                onConfirm={() => deleteSession(selectedSession.id)}
              />
            ) : (
              <div className="record-modal-actions">
                <button className="btn danger" onClick={() => setConfirmingDelete(true)}><Icon name="trash-2" size={18} />Delete workout</button>
                <button className="btn subtle" onClick={closeDetail}>Close</button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {editingSet && (
        <Modal title={`Edit set ${editingSet.displayOrder}`} onClose={() => setEditingSet(null)}>
          <form className="workout-set-editor" onSubmit={saveSet}>
            <div className="workout-set-editor__exercise"><span>Exercise</span><strong>{editingSet.exercise?.name || 'Unknown exercise'}</strong></div>
            <label>Weight (kg)<input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={setForm.weight} onChange={(e) => setSetForm({ ...setForm, weight: e.target.value })} /></label>
            <label>Reps<input className="input" type="number" min="0" step="1" inputMode="numeric" value={setForm.reps} onChange={(e) => setSetForm({ ...setForm, reps: e.target.value })} /></label>
            <label>Distance (m)<input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={setForm.distance} onChange={(e) => setSetForm({ ...setForm, distance: e.target.value })} /></label>
            <label>Duration (seconds)<input className="input" type="number" min="0" step="1" inputMode="numeric" value={setForm.durationSec} onChange={(e) => setSetForm({ ...setForm, durationSec: e.target.value })} /></label>
            <label>RPE<input className="input" type="number" min="0" max="10" step="0.5" inputMode="decimal" value={setForm.rpe} onChange={(e) => setSetForm({ ...setForm, rpe: e.target.value })} /></label>
            <label className="workout-set-editor__notes">Notes<textarea className="input" rows="3" value={setForm.notes} onChange={(e) => setSetForm({ ...setForm, notes: e.target.value })} /></label>
            {editSetError && <div className="alert-error workout-set-editor__error" role="alert">{editSetError}</div>}
            <div className="record-modal-actions workout-set-editor__actions"><button type="button" className="btn subtle" onClick={() => setEditingSet(null)}>Cancel</button><button type="submit" className="btn primary" disabled={savingSet}>{savingSet ? 'Saving…' : 'Save set'}</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
