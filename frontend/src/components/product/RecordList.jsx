import React from 'react'

export function RecordList({ children, className = '', label }) {
  return (
    <div className={`record-list record-surface ${className}`.trim()} aria-label={label}>
      {children}
    </div>
  )
}

export function RecordListRow({ children, className = '' }) {
  return <div className={`record-list__row record-row ${className}`.trim()}>{children}</div>
}
