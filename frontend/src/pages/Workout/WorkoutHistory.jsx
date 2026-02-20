import React, { useEffect, useState, useRef } from 'react'
import { api } from '../../api'
import {
  LoadingSpinner,
  SessionCard,
  SetRow,
  StatCard,
  Modal,
  SkeletonStatCard,
  SkeletonSessionCard,
  formatDate,
  formatDateTime,
  formatSessionDuration,
  calculateVolume,
  formatNumberShort,
} from '../../components/shared'

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
  const [exercises, setExercises] = useState([])

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
  function closeDetail() { setShowDetail(false); setSelectedSession(null) }

  async function deleteSession(sessionId) {
    if (!window.confirm('Delete this workout session? All sets will be removed.')) return
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
      <h2><span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 8 }}>bar_chart</span>Workout History</h2>

      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {loading && page === 1 ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Workouts" value={totalWorkouts} />
            <StatCard label="Total Sets" value={totalSets} />
            <StatCard label="Total Reps" value={totalReps} />
            <StatCard label="Total Volume" value={`${totalVolume} kg`} />
            <StatCard label="Total Time" value={totalTimeSeconds > 0 ? `${Math.floor(totalTimeSeconds / 3600)}h ${Math.floor((totalTimeSeconds % 3600) / 60)}m` : '—'} />
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>Search</label>
            <input type="text" className="input" placeholder="Search title, notes, date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>Filter by Date</label>
            <input type="date" className="input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
        </div>
        {(searchTerm || dateFilter) && (
          <button className="btn small" onClick={() => { setSearchTerm(''); setDateFilter('') }} style={{ marginTop: '.75rem' }}>Clear Filters</button>
        )}
      </div>

      {loading && page === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonSessionCard key={i} />)}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <span className="material-icons" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--color-accent)' }}>inbox</span>
          <h3>No workouts found</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '.5rem' }}>
            {searchTerm || dateFilter ? 'Try adjusting your filters' : 'Start tracking to see your history here'}
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 4, fontSize: 16 }}>check_circle</span>
              You've reached the end of your workout history
            </div>
          )}
        </div>
      )}

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <StatCard label="Sets" value={(selectedSession.sets || []).length} />
              <StatCard label="Exercises" value={new Set((selectedSession.sets || []).filter(s => s.exerciseId).map(s => s.exerciseId)).size} />
              <StatCard label="Volume" value={calculateVolume(selectedSession.sets || []) > 0 ? `${calculateVolume(selectedSession.sets || []).toFixed(0)} kg` : '—'} />
            </div>
            {selectedSession.notes && (
              <div className="card" style={{ background: 'var(--color-accent-muted)', padding: '1rem' }}>
                <div style={{ fontSize: '.85rem', color: 'var(--color-text-secondary)', marginBottom: '.5rem', fontWeight: 600 }}>Notes</div>
                <div style={{ fontSize: '.95rem' }}>{selectedSession.notes}</div>
              </div>
            )}
            <div>
              <h4 style={{ marginBottom: '.75rem' }}>Sets</h4>
              {(selectedSession.sets || []).length === 0 ? (
                <div className="empty-state">No sets recorded</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(() => {
                    const sortedSets = [...(selectedSession.sets || [])].sort((a, b) => a.order - b.order)
                    const grouped = sortedSets.reduce((acc, set) => { const id = set.exerciseId || 'unknown'; if (!acc[id]) acc[id] = []; acc[id].push(set); return acc }, {})
                    return Object.entries(grouped).map(([exerciseId, sets]) => {
                      const exercise = exercises.find(e => e.id === exerciseId) || sets[0]?.exercise
                      const category = exercise?.category || sets[0]?.category
                      return (
                        <div key={exerciseId} className="card" style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.75rem', paddingBottom: '.75rem', borderBottom: '1px solid var(--glass-border)' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{exercise?.name || (exerciseId !== 'unknown' ? `Exercise ${exerciseId.slice(0, 8)}` : 'Unknown Exercise')}</div>
                              {category && <span className="badge" style={{ marginTop: '0.25rem', background: category.color ? `${category.color}20` : 'var(--color-accent-muted)', color: category.color || 'var(--color-accent)', border: `1px solid ${category.color || 'var(--color-accent)'}40` }}>{category.name}</span>}
                            </div>
                            <div style={{ fontSize: '.85rem', color: 'var(--color-text-muted)' }}>{sets.length} {sets.length === 1 ? 'set' : 'sets'}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                            {sets.map((set, idx) => <SetRow key={set.id} set={{ ...set, order: idx + 1 }} exercise={exercise} showOrder />)}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '.75rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <button className="btn btn-danger" onClick={() => deleteSession(selectedSession.id)}>
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 4, fontSize: 18 }}>delete</span>Delete Workout
              </button>
              <button className="btn btn-ghost" onClick={closeDetail} style={{ marginLeft: 'auto' }}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
