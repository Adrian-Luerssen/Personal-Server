import React, { useId } from 'react'

export default function ColorField({ label = 'Colour', onChange, value }) {
  const inputId = useId()
  const normalizedValue = String(value || '#7c5cff').toUpperCase()

  return (
    <div className="record-color-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="record-color-field__control">
        <span className="record-color-field__swatch" style={{ backgroundColor: value }} aria-hidden="true" />
        <span className="record-color-field__copy">
          <strong>Choose colour</strong>
          <span className="record-color-field__value">{normalizedValue}</span>
        </span>
        <input id={inputId} type="color" aria-label={`Choose colour. Current value ${normalizedValue}`} value={value} onChange={onChange} />
      </div>
    </div>
  )
}
