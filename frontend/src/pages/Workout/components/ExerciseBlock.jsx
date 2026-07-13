import React from 'react'

import SetEditorRow from './SetEditorRow'

function setSummary(set) {
  const weight = Number(set.weight || 0)
  const reps = Number(set.reps || 0)
  if (weight && reps) return `${weight} × ${reps}`
  if (reps) return `${reps} reps`
  if (set.durationSec) return `${set.durationSec}s`
  return 'Recorded'
}

export default function ExerciseBlock({ draft, exercise, onComplete, onDraftChange, saving, sets }) {
  const previous = sets.length ? setSummary(sets[sets.length - 1]) : 'First set'
  return (
    <section className="gym-exercise-block">
      <header>
        <div>
          <h2>{exercise?.name || 'Exercise'}</h2>
          <span>{exercise?.muscleGroup || 'Working set'}</span>
        </div>
        <strong>{sets.length} {sets.length === 1 ? 'set' : 'sets'}</strong>
      </header>
      <div className="gym-set-head" aria-hidden="true">
        <span>Previous</span><span>kg</span><span>Reps</span><span>Done</span>
      </div>
      {sets.map((set, index) => (
        <div className="gym-set-row gym-set-row--complete" key={set.id}>
          <span>{index + 1}</span>
          <strong>{set.weight || '—'}</strong>
          <strong>{set.reps || '—'}</strong>
          <span aria-label="Completed">✓</span>
        </div>
      ))}
      <SetEditorRow
        disabled={saving}
        draft={draft}
        onChange={onDraftChange}
        onComplete={onComplete}
        previous={previous}
      />
    </section>
  )
}
