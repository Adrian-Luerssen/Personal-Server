import React from 'react'
import { formatDistance, formatDurationSec } from './formatters'

export function SetRow({ set, exercise, onEdit, onDelete, showOrder = true }) {
  const exerciseName = exercise?.name || (set.exerciseId ? `Exercise ${set.exerciseId.slice(0, 8)}` : 'Unknown')

  return (
    <div style={{
      padding: '.5rem .75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      background: 'var(--color-accent-muted)',
      borderRadius: 'var(--radius-md)',
    }}>
      {showOrder && (
        <div style={{
          minWidth: 28, height: 28, borderRadius: '50%',
          background: 'var(--color-accent-muted)',
          color: 'var(--color-accent)',
          display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: '.9rem'
        }}>
          {set.order}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{exerciseName}</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '.85rem', marginTop: 2 }}>
          {set.reps && `${set.reps} reps`}
          {set.weight && ` × ${set.weight} kg`}
          {set.distance && ` • ${formatDistance(set.distance)}`}
          {set.durationSec && ` • ${formatDurationSec(set.durationSec)}`}
          {set.rpe && ` • RPE ${set.rpe}`}
        </div>
        {set.notes && (
          <div style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>
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
            <button className="btn small btn-danger" onClick={() => onDelete(set)}>
              <span className="material-icons" style={{ fontSize: '18px' }}>delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
