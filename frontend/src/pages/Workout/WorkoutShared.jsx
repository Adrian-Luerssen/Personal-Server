import React from 'react'

// ========== Formatters ==========
export function formatNumberShort(num) {
  if (num === null || num === undefined || isNaN(num)) return '0'
  num = num.toFixed(0)
  if (num < 1000) return String(num)
  // handle floating point numbers
  
  const abs = Math.abs(num)
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(num % 1_000_000_000 === 0 ? 0 : 1) + 'B'
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + 'M'
  if (abs >= 1_000) return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + 'K'
  return String(num)
}

export function formatDuration(startAt, endAt) {
  if (!startAt) return '—'
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : new Date()
  const diffMs = end - start
  if (diffMs < 0) return '—'
  const mins = Math.floor(diffMs / 1000 / 60)
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  if (hrs > 0) return `${hrs}h ${remainMins}m`
  return `${mins}m`
}

export function formatDateTime(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

export function formatTime(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatWeight(kg) {
  if (kg === null || kg === undefined) return '—'
  kg = formatNumberShort(kg)
  return `${kg} kg`
}

export function formatDistance(meters) {
  if (meters === null || meters === undefined) return '—'
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${meters} m`
}

export function formatDurationSec(sec) {
  if (sec === null || sec === undefined) return '—'
  if (sec < 60) return `${sec}s`
  const mins = Math.floor(sec / 60)
  const secs = sec % 60
  return `${mins}m ${secs}s`
}

export function calculateVolume(sets) {
  if (!Array.isArray(sets)) return 0
  return sets.reduce((sum, s) => {
    if (s.reps && s.weight) return sum + (s.reps * s.weight)
    return sum
  }, 0)
}

// ========== Loading Components ==========

export function LoadingSpinner({ size = 24 }) {
  return (
    <div style={{ 
      width: size, 
      height: size, 
      border: '3px solid rgba(125,211,252,0.2)', 
      borderTop: '3px solid #7dd3fc', 
      borderRadius: '50%', 
      animation: 'spin 1s linear infinite' 
    }} />
  )
}

export function LoadingLine({ width = 100 }) {
  return (
    <div style={{ 
      background: 'rgba(125,211,252,0.18)', 
      height: 16, 
      width, 
      borderRadius: 6, 
      margin: '4px 0', 
      animation: 'pulse 1.2s infinite alternate' 
    }} />
  )
}

// Reusable skeleton card with configurable lines
export function SkeletonCard({ lines = 3, widths }) {
  const defaultWidths = widths || ["80%", "60%", "40%"]
  const rows = Array.from({ length: lines })
  return (
    <div className="card" style={{ padding: '.75rem' }}>
      {rows.map((_, i) => (
        <LoadingLine key={i} width={defaultWidths[i % defaultWidths.length]} />
      ))}
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="card" style={{ padding: '.75rem' }}>
      <LoadingLine width={"50%"} />
      <div style={{ height: 8 }} />
      <LoadingLine width={"70%"} />
    </div>
  )
}

export function SkeletonSessionCard() {
  return (
    <div className="card" style={{ padding: '.75rem' }}>
      <LoadingLine width={"40%"} />
      <LoadingLine width={"30%"} />
      <div style={{ height: 8 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem' }}>
        <LoadingLine width={"80%"} />
        <LoadingLine width={"60%"} />
        <LoadingLine width={"70%"} />
      </div>
    </div>
  )
}

// ========== Card Components ==========

export function StatCard({ label, value, subtitle }) {
  return (
    <div className="card" style={{ padding: '.75rem' }}>
      <div style={{ opacity: .8, fontSize: '.9rem' }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 800, fontSize: '1.4rem', minHeight: '2rem' }}>
        {value}
      </div>
      {subtitle && <div style={{ fontSize: '.85rem', opacity: .7, marginTop: 4 }}>{subtitle}</div>}
    </div>
  )
}

export function SessionCard({ session, onClick }) {
  const duration = formatDuration(session.startAt, session.endAt)
  const volume = calculateVolume(session.sets || [])
  const setsCount = (session.sets || []).length
  const uniqueExercises = new Set(
    (session.sets || []).filter(s => s.exerciseId).map(s => s.exerciseId)
  ).size
  const categories = session.categories || []

  return (
    <div 
      className="card" 
      style={{ 
        cursor: 'pointer', 
        transition: 'all 0.2s',
        ':hover': { transform: 'translateY(-2px)' }
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {session.title || formatDate(session.startAt)}
          </div>
          <div style={{ opacity: .7, fontSize: '.9rem' }}>
            {formatTime(session.startAt)} {session.endAt ? `— ${formatTime(session.endAt)}` : '(in progress)'}
          </div>
          
          {/* Categories badges */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <span
                  key={cat.id}
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: '.75rem',
                    fontWeight: 600,
                    background: cat.color ? `${cat.color}20` : 'rgba(125,211,252,0.2)',
                    color: cat.color || '#7dd3fc',
                    border: `1px solid ${cat.color || '#7dd3fc'}40`
                  }}
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ 
          padding: '4px 10px', 
          background: session.endAt ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
          color: session.endAt ? '#22c55e' : '#fbbf24',
          borderRadius: 6,
          fontSize: '.85rem',
          fontWeight: 600,
          flexShrink: 0,
          marginLeft: '0.5rem'
        }}>
          {session.endAt ? duration : 'Active'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: 12 }}>
        <div>
          <div style={{ opacity: .7, fontSize: '.85rem' }}>Sets</div>
          <div style={{ fontWeight: 700 }}>{setsCount}</div>
        </div>
        <div>
          <div style={{ opacity: .7, fontSize: '.85rem' }}>Exercises</div>
          <div style={{ fontWeight: 700 }}>{uniqueExercises}</div>
        </div>
        <div>
          <div style={{ opacity: .7, fontSize: '.85rem' }}>Volume</div>
          <div style={{ fontWeight: 700 }}>{volume > 0 ? `${volume.toFixed(0)} kg` : '—'}</div>
        </div>
      </div>

      {session.notes && (
        <div style={{ marginTop: 12, padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: '.9rem' }}>
          {session.notes}
        </div>
      )}
    </div>
  )
}

export function SetRow({ set, exercise, onEdit, onDelete, showOrder = true }) {
  const exerciseName = exercise?.name || (set.exerciseId ? `Exercise ${set.exerciseId.slice(0, 8)}` : 'Unknown')
  
  return (
    <div 
      className="card" 
      style={{ 
        padding: '.5rem .75rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        background: 'rgba(255,255,255,0.03)'
      }}
    >
      {showOrder && (
        <div style={{ 
          minWidth: 28, 
          height: 28, 
          borderRadius: '50%', 
          background: 'rgba(125,211,252,0.2)', 
          color: '#7dd3fc',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          fontSize: '.9rem'
        }}>
          {set.order}
        </div>
      )}
      
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{exerciseName}</div>
        <div style={{ opacity: .7, fontSize: '.85rem', marginTop: 2 }}>
          {set.reps && `${set.reps} reps`}
          {set.weight && ` × ${set.weight} kg`}
          {set.distance && ` • ${formatDistance(set.distance)}`}
          {set.durationSec && ` • ${formatDurationSec(set.durationSec)}`}
          {set.rpe && ` • RPE ${set.rpe}`}
        </div>
        {set.notes && (
          <div style={{ fontSize: '.8rem', opacity: .6, marginTop: 4, fontStyle: 'italic' }}>
            {set.notes}
          </div>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {onEdit && (
            <button className="btn small" onClick={() => onEdit(set)}>
              <span className="material-icons" style={{ fontSize: '18px' }}>edit</span>
            </button>
          )}
          {onDelete && (
            <button 
              className="btn small" 
              onClick={() => onDelete(set)}
              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              <span className="material-icons" style={{ fontSize: '18px' }}>delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function ExerciseCard({ exercise, onEdit, onDelete, onClick }) {
  return (
    <div 
      className="card" 
      style={{ 
        padding: '.75rem',
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{exercise.name}</div>
          {exercise.muscleGroup && (
            <div style={{ opacity: .7, fontSize: '.85rem', marginTop: 4 }}>
              {exercise.muscleGroup}
            </div>
          )}
          {exercise.notes && (
            <div style={{ fontSize: '.85rem', opacity: .6, marginTop: 6, fontStyle: 'italic' }}>
              {exercise.notes}
            </div>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div style={{ display: 'flex', gap: '.5rem' }}>
            {onEdit && (
              <button className="btn small" onClick={(e) => { e.stopPropagation(); onEdit(exercise); }}>
                <span className="material-icons" style={{ fontSize: '18px' }}>edit</span>
              </button>
            )}
            {onDelete && (
              <button 
                className="btn small" 
                onClick={(e) => { e.stopPropagation(); onDelete(exercise); }}
                style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
              >
                <span className="material-icons" style={{ fontSize: '18px' }}>delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ========== Modal Base ==========

export function Modal({ title, onClose, children, size = 'medium' }) {
  const widthMap = {
    small: '400px',
    medium: '560px',
    large: '720px',
    xlarge: '900px'
  }
  
  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        background: 'rgba(0,0,0,0.5)', 
        zIndex: 1000, 
        display: 'grid', 
        placeItems: 'center',
        padding: '2rem'
      }}
      onClick={onClose}
    >
      <div 
        className="custom-scrollbar"
        style={{ 
          background: '#181f2a', 
          borderRadius: 12, 
          padding: '1.5rem', 
          minWidth: 340, 
          maxWidth: widthMap[size], 
          width: '100%',
          maxHeight: '90vh', 
          boxShadow: '0 4px 24px #0008', 
          position: 'relative',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn small" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

