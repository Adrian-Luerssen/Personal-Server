import React from 'react'

import Icon from '../icons/Icon'

export default function IconInput({ className = '', icon = 'search', ...inputProps }) {
  return (
    <div className={`record-icon-input ${className}`.trim()}>
      <span className="record-icon-input__icon" aria-hidden="true">
        <Icon name={icon} size={16} />
      </span>
      <input {...inputProps} />
    </div>
  )
}
