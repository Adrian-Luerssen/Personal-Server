import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { LoadingSpinner, StatCard, SessionCard, formatDate, calculateVolume, SkeletonStatCard, SkeletonSessionCard, SkeletonCard, formatNumberShort } from './WorkoutShared'

export default function Workout() {
  const { sidebarCollapsed } = useOutletContext() || {}
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

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    try {
      // Get active session
      const activeSession = await api.get('/workout/sessions/active')
      if (activeSession) {
        setActiveSession(activeSession)
      }

      // Get recent sessions
      const recent = await api.get('/workout/sessions/recent')
      setRecentSessions(recent || [])

      // Get all bodyweight entries and pick latest
      const bodyweights = await api.get('/workout/bodyweight')
      if (bodyweights && bodyweights.length > 0) {
        // Sort by date descending and pick first
        const sorted = [...bodyweights].sort((a, b) => new Date(b.date) - new Date(a.date))
        setLatestWeight(sorted[0])
      }

      // Get sessions summary stats
      const sessionsData = await api.get('/workout/sessions?page=1&limit=20')
      
      // Calculate this week's count from recent sessions
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const thisWeek = recent.filter(s => new Date(s.startAt) >= oneWeekAgo).length

      setStats({
        totalSessions: formatNumberShort(sessionsData.totalWorkouts) || 0,
        totalSets: formatNumberShort(sessionsData.totalSets) || 0,
        totalReps: formatNumberShort(sessionsData.totalReps) || 0,
        totalVolume: formatNumberShort(sessionsData.totalVolume) || 0,
        thisWeek
      })
    } catch (e) {
      console.error('Failed to load dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  async function startWorkout() {
    try {
      const session = await api.post('/workout/sessions/start', {})
      navigate('/workout/active')
    } catch (e) {
      console.error('Failed to start workout:', e)
    }
  }

  return (
    <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
      <h1><span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '8px' }}>fitness_center</span>Workout Tracker</h1>

      <div>
        {/* Active workout banner or skeleton */}
        {loading ? (
          <SkeletonCard lines={2} widths={["30%", "50%"]} />
        ) : activeSession ? (
          <div 
            className="card" 
            style={{ 
              marginBottom: '1.5rem', 
              background: 'rgba(251,191,36,0.15)',
              borderColor: 'rgba(251,191,36,0.3)',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/workout/active')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="material-icons" style={{ fontSize: '2rem', color: '#fbbf24' }}>directions_run</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fbbf24' }}>
                  Workout in Progress
                </div>
                <div style={{ opacity: .9, fontSize: '.9rem', marginTop: 4 }}>
                  {activeSession.sets?.length || 0} sets • Started {formatDate(activeSession.startAt)}
                </div>
              </div>
              <button className="btn" onClick={(e) => { e.stopPropagation(); navigate('/workout/active'); }}>
                Continue →
              </button>
            </div>
          </div>
        ) : null}

        {/* Quick stats or skeletons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard label="Total Workouts" value={stats.totalSessions} />
              <StatCard label="This Week" value={stats.thisWeek} />
              <StatCard label="Total Sets" value={stats.totalSets} />
              <StatCard label="Total Reps" value={stats.totalReps} />
              <StatCard label="Total Volume" value={`${stats.totalVolume} kg`} />
              {latestWeight && (
                <StatCard 
                  label="Latest Weight" 
                  value={`${latestWeight.weightKg} kg`}
                  subtitle={formatDate(latestWeight.date)}
                />
              )}
            </>
          )}
        </div>

        {/* Quick actions (static) */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '.75rem' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            <button 
              className="card" 
              style={{ 
                padding: '1.5rem', 
                textAlign: 'center',
                cursor: 'pointer',
                border: '2px solid rgba(125,211,252,0.3)',
                background: 'rgba(125,211,252,0.1)',
                color: 'inherit'
              }}
              onClick={startWorkout}
            >
              <span className="material-icons" style={{ fontSize: '2.5rem', marginBottom: '.5rem', color: '#7dd3fc' }}>fitness_center</span>
              <div style={{ fontWeight: 700 }}>Start Workout</div>
            </button>

            <button 
              className="card" 
              style={{ 
                padding: '1.5rem', 
                textAlign: 'center',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'inherit'
              }}
              onClick={() => navigate('/workout/history')}
            >
              <span className="material-icons" style={{ fontSize: '2.5rem', marginBottom: '.5rem', color: '#7dd3fc' }}>bar_chart</span>
              <div style={{ fontWeight: 700 }}>View History</div>
            </button>

            <button 
              className="card" 
              style={{ 
                padding: '1.5rem', 
                textAlign: 'center',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'inherit'
              }}
              onClick={() => navigate('/workout/exercises')}
            >
              <span className="material-icons" style={{ fontSize: '2.5rem', marginBottom: '.5rem', color: '#7dd3fc' }}>folder_open</span>
              <div style={{ fontWeight: 700 }}>Manage Exercises</div>
            </button>

            <button 
              className="card" 
              style={{ 
                padding: '1.5rem', 
                textAlign: 'center',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'inherit'
              }}
              onClick={() => navigate('/workout/bodyweight')}
            >
              <span className="material-icons" style={{ fontSize: '2.5rem', marginBottom: '.5rem', color: '#7dd3fc' }}>monitor_weight</span>
              <div style={{ fontWeight: 700 }}>Bodyweight</div>
            </button>

            <button 
              className="card" 
              style={{ 
                padding: '1.5rem', 
                textAlign: 'center',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'inherit'
              }}
              onClick={() => navigate('/workout/import')}
            >
              <span className="material-icons" style={{ fontSize: '2.5rem', marginBottom: '.5rem', color: '#7dd3fc' }}>file_download</span>
              <div style={{ fontWeight: 700 }}>Import Data</div>
            </button>
          </div>
        </div>

        {/* Recent workouts */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
            <h3>Recent Workouts</h3>
            <button className="btn small" onClick={() => navigate('/workout/history')}>
              View All →
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Array.from({ length: 3 }).map((_, i) => <SkeletonSessionCard key={i} />)}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', opacity: .7 }}>
              No workouts yet. Start your first workout!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentSessions.map(session => (
                <SessionCard 
                  key={session.id}
                  session={session}
                  onClick={() => navigate('/workout/history')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
