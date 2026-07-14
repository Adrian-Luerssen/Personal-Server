import React from 'react'
import Icon from '../icons/Icon'

export function StepIndicator({ current, steps }) {
  return (
    <ol
      className="record-stepper"
      aria-label="Import progress"
      style={{ '--record-step-count': steps.length }}
    >
      {steps.map((label, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < current
        const isActive = stepNumber === current

        return (
          <li
            className={`${isComplete ? 'is-complete' : ''}${isActive ? ' is-active' : ''}`.trim()}
            aria-current={isActive ? 'step' : undefined}
            key={stepNumber}
          >
            <span className="record-stepper__index" aria-hidden="true">
              {isComplete ? <Icon name="check" size={13} /> : String(stepNumber).padStart(2, '0')}
            </span>
            <span className="record-stepper__label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
