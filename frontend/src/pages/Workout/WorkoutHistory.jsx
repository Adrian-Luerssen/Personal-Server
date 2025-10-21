import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from '../../api'
import { 
  LoadingSpinner, 
  SessionCard, 
  SetRow,
  StatCard,
  Modal,
  formatDate,
  formatDateTime,
  formatDuration,
  calculateVolume,
  SkeletonStatCard,
  formatNumberShort,
  SkeletonSessionCard
} from './WorkoutShared'

export default function WorkoutHistory() {
  const { sidebarCollapsed } = useOutletContext() || {}
  
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isPreloading, setIsPreloading] = useState(false)
  
  // Summary stats from backend
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [totalSets, setTotalSets] = useState(0)
  const [totalReps, setTotalReps] = useState(0)
  const [totalVolume, setTotalVolume] = useState(0)
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(0)
  
  // Detail modal
  const [selectedSession, setSelectedSession] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [exercises, setExercises] = useState([])

  // Filters
  const [dateFilter, setDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Infinite scroll observer
  const observerRef = useRef(null)
  const loadMoreRef = useRef(null)

  useEffect(() => {
    loadSessions(1, true)
    loadExercises()
  }, [dateFilter])
  
  // Infinite scroll setup
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
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, isPreloading, page, searchTerm, dateFilter])

  async function loadSessions(pageNum = 1, reset = false) {
    if (reset) {
      setLoading(true)
    }
    setError('')
    try {
      // Get paginated sessions with summary stats (10 per page)
      const params = new URLSearchParams({ page: pageNum, limit: 10 })
      const data = await api.get(`/workout/sessions?${params}`)
      
      const newSessions = data.sessions || []
      
      // Update summary stats from backend
      if (data.totalWorkouts !== undefined) setTotalWorkouts(formatNumberShort(data.totalWorkouts))
      if (data.totalSets !== undefined) setTotalSets(formatNumberShort(data.totalSets))
      if (data.totalReps !== undefined) setTotalReps(formatNumberShort(data.totalReps))
      if (data.totalVolume !== undefined) setTotalVolume(formatNumberShort(data.totalVolume))
      if (data.totalTimeSeconds !== undefined) setTotalTimeSeconds(data.totalTimeSeconds)

      if (reset) {
        setSessions(newSessions)
      } else {
        setSessions(prev => [...prev, ...newSessions])
      }
      setPage(pageNum)
      setHasMore(newSessions.length === 10)
      
      // Preload next page if we have more data
      if (newSessions.length === 10 && !isPreloading) {
        preloadNextPage(pageNum + 1)
      }
    } catch (e) {
      setError(e.message || 'Failed to load sessions')
    } finally {
      if (reset) {
        setLoading(false)
      }
    }
  }
  
  async function preloadNextPage(nextPage) {
    setIsPreloading(true)
    try {
      const params = new URLSearchParams({ page: nextPage, limit: 10 })
      await api.get(`/workout/sessions?${params}`)
      // Don't set the data, just cache it
    } catch (e) {
      // Silently fail preload
    } finally {
      setIsPreloading(false)
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

  function openDetail(session) {
    setSelectedSession(session)
    setShowDetail(true)
  }

  function closeDetail() {
    setShowDetail(false)
    setSelectedSession(null)
  }

  async function deleteSession(sessionId) {
    if (!window.confirm('Delete this workout session? All sets will be removed.')) return
    setError('')
    try {
      await api.post(`/workout/sessions/${sessionId}`, { method: 'DELETE' })
      setSessions(sessions.filter(s => s.id !== sessionId))
      closeDetail()
      // Reload to update stats
      loadSessions(1, true)
    } catch (e) {
      setError(e.message || 'Failed to delete session')
    }
  }

  // Filter sessions by date and search term (client-side)
  let filteredSessions = sessions
  if (dateFilter) {
    filteredSessions = filteredSessions.filter(s => s.date === dateFilter)
  }
  filteredSessions = filteredSessions.filter(s => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const title = (s.title || '').toLowerCase()
    const notes = (s.notes || '').toLowerCase()
    const date = formatDate(s.startAt).toLowerCase()
    return title.includes(term) || notes.includes(term) || date.includes(term)
  })

  return (
    <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
      <h1>📊 Workout History</h1>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.5)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
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

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
              Search
            </label>
            <input 
              type="text"
              className="input"
              placeholder="Search title, notes, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
              Filter by Date
            </label>
            <input 
              type="date"
              className="input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
        {(searchTerm || dateFilter) && (
          <button 
            className="btn small" 
            onClick={() => { setSearchTerm(''); setDateFilter(''); }}
            style={{ marginTop: '.75rem' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Sessions List */}
      {loading && page === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (<SkeletonSessionCard key={i} />))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h3>No workouts found</h3>
          <p style={{ opacity: .7, marginTop: '.5rem' }}>
            {searchTerm || dateFilter ? 'Try adjusting your filters' : 'Start tracking to see your history here'}
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredSessions.map(session => (
              <SessionCard 
                key={session.id} 
                session={session} 
                onClick={() => openDetail(session)}
              />
            ))}
          </div>

          {/* Infinite scroll trigger element */}
          {hasMore && !searchTerm && !dateFilter && (
            <div 
              ref={loadMoreRef}
              style={{ 
                textAlign: 'center', 
                marginTop: '1.5rem',
                padding: '2rem',
                opacity: loading ? 0.6 : 0.3
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '.5rem' }}>
                  <LoadingSpinner size={24} />
                  <span>Loading more...</span>
                </div>
              ) : (
                <div style={{ fontSize: '.9rem' }}>
                  Scroll for more workouts {isPreloading && '(preloading next page...)'}
                </div>
              )}
            </div>
          )}
          
          {!hasMore && sessions.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem', opacity: .5, fontSize: '.9rem' }}>
              🎉 You've reached the end of your workout history
            </div>
          )}
        </div>
      )}

      {/* Session Detail Modal */}
      {showDetail && selectedSession && (
        <Modal title="Workout Details" onClose={closeDetail} size="large">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Session header */}
            <div>
              <h3 style={{ marginBottom: '.5rem' }}>
                {selectedSession.title || formatDate(selectedSession.startAt)}
              </h3>
              <div style={{ opacity: .7, fontSize: '.9rem' }}>
                {formatDateTime(selectedSession.startAt)} 
                {selectedSession.endAt && ` — ${formatDateTime(selectedSession.endAt)}`}
              </div>
              <div style={{ 
                display: 'inline-block',
                marginTop: '.5rem',
                padding: '4px 10px', 
                background: selectedSession.endAt ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                color: selectedSession.endAt ? '#22c55e' : '#fbbf24',
                borderRadius: 6,
                fontSize: '.85rem',
                fontWeight: 600
              }}>
                {selectedSession.endAt ? formatDuration(selectedSession.startAt, selectedSession.endAt) : 'In Progress'}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <StatCard 
                label="Sets" 
                value={(selectedSession.sets || []).length} 
              />
              <StatCard 
                label="Exercises" 
                value={new Set((selectedSession.sets || []).filter(s => s.exerciseId).map(s => s.exerciseId)).size}
              />
              <StatCard 
                label="Volume" 
                value={calculateVolume(selectedSession.sets || []) > 0 ? `${calculateVolume(selectedSession.sets || []).toFixed(0)} kg` : '—'}
              />
            </div>

            {/* Notes */}
            {selectedSession.notes && (
              <div className="card" style={{ background: 'rgba(125,211,252,0.1)', padding: '1rem' }}>
                <div style={{ fontSize: '.85rem', opacity: .8, marginBottom: '.5rem', fontWeight: 600 }}>
                  Notes
                </div>
                <div style={{ fontSize: '.95rem' }}>
                  {selectedSession.notes}
                </div>
              </div>
            )}

            {/* Sets */}
            <div>
              <h4 style={{ marginBottom: '.75rem' }}>Sets</h4>
              {(selectedSession.sets || []).length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '1.5rem', opacity: .7 }}>
                  No sets recorded
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(() => {
                    // Group sets by exercise
                    const sortedSets = [...(selectedSession.sets || [])].sort((a, b) => a.order - b.order)
                    const groupedByExercise = sortedSets.reduce((acc, set) => {
                      const exerciseId = set.exerciseId || 'unknown'
                      if (!acc[exerciseId]) {
                        acc[exerciseId] = []
                      }
                      acc[exerciseId].push(set)
                      return acc
                    }, {})

                    return Object.entries(groupedByExercise).map(([exerciseId, sets]) => {
                      const exercise = exercises.find(e => e.id === exerciseId) || sets[0]?.exercise
                      const exerciseName = exercise?.name || (exerciseId !== 'unknown' ? `Exercise ${exerciseId.slice(0, 8)}` : 'Unknown Exercise')
                      const category = exercise?.category || sets[0]?.category

                      return (
                        <div key={exerciseId} className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                          {/* Exercise header with category */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.75rem', paddingBottom: '.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                                {exerciseName}
                              </div>
                              {category && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    marginTop: '0.25rem',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    fontSize: '.75rem',
                                    fontWeight: 600,
                                    background: category.color ? `${category.color}20` : 'rgba(125,211,252,0.2)',
                                    color: category.color || '#7dd3fc',
                                    border: `1px solid ${category.color || '#7dd3fc'}40`
                                  }}
                                >
                                  {category.name}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '.85rem', opacity: .7 }}>
                              {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                            </div>
                          </div>

                          {/* Sets for this exercise */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                            {sets.map((set, idx) => (
                              <SetRow 
                                key={set.id} 
                                set={{ ...set, order: idx + 1 }} 
                                exercise={exercise}
                                showOrder
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <button 
                className="btn" 
                onClick={() => deleteSession(selectedSession.id)}
                style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
              >
                🗑️ Delete Workout
              </button>
              <button className="btn" onClick={closeDetail} style={{ marginLeft: 'auto' }}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}


