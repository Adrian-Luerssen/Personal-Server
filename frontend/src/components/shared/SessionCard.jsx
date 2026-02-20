import React from 'react'
import { formatSessionDuration, formatDate, formatTime, calculateVolume } from './formatters'

export function SessionCard({ session, onClick }) {
  const duration = formatSessionDuration(session.startAt, session.endAt)
  const volume = calculateVolume(session.sets || [])
  const setsCount = (session.sets || []).length
  const uniqueExercises = new Set(
    (session.sets || []).filter(s => s.exerciseId).map(s => s.exerciseId)
  ).size
  const categories = session.categories || []

  return (
    <div className="card interactive" onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {session.title || formatDate(session.startAt)}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '.9rem' }}>
            {formatTime(session.startAt)} {session.endAt ? `— ${formatTime(session.endAt)}` : '(in progress)'}
          </div>
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <span
                  key={cat.id}
                  className="badge"
                  style={{
                    background: cat.color ? `${cat.color}20` : 'var(--color-accent-muted)',
                    color: cat.color || 'var(--color-accent)',
                    border: `1px solid ${cat.color || 'var(--color-accent)'}40`
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
          background: session.endAt ? 'var(--color-success-muted)' : 'var(--color-warning-muted)',
          color: session.endAt ? 'var(--color-success)' : 'var(--color-warning)',
          borderRadius: 'var(--radius-sm)',
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
          <div className="stat-label">Sets</div>
          <div style={{ fontWeight: 700 }}>{setsCount}</div>
        </div>
        <div>
          <div className="stat-label">Exercises</div>
          <div style={{ fontWeight: 700 }}>{uniqueExercises}</div>
        </div>
        <div>
          <div className="stat-label">Volume</div>
          <div style={{ fontWeight: 700 }}>{volume > 0 ? `${volume.toFixed(0)} kg` : '—'}</div>
        </div>
      </div>

      {session.notes && (
        <div style={{ marginTop: 12, padding: '8px', background: 'var(--color-accent-muted)', borderRadius: 'var(--radius-sm)', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>
          {session.notes}
        </div>
      )}
    </div>
  )
}
