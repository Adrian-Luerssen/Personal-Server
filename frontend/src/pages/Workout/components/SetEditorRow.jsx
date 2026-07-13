import React from 'react'

import Icon from '../../../components/icons/Icon'

export default function SetEditorRow({ disabled, draft, onChange, onComplete, previous }) {
  return (
    <div className="gym-set-row gym-set-row--editor">
      <span className="gym-set-row__previous">{previous || '—'}</span>
      <label>
        <span className="sr-only">Weight kilograms</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          value={draft.weight}
          onChange={(event) => onChange({ ...draft, weight: event.target.value })}
          aria-label="Weight kilograms"
        />
      </label>
      <label>
        <span className="sr-only">Repetitions</span>
        <input
          type="number"
          inputMode="numeric"
          value={draft.reps}
          onChange={(event) => onChange({ ...draft, reps: event.target.value })}
          aria-label="Repetitions"
        />
      </label>
      <button type="button" onClick={onComplete} disabled={disabled || (!draft.weight && !draft.reps)} aria-label="Complete set">
        <Icon name="check" size={19} />
      </button>
    </div>
  )
}
