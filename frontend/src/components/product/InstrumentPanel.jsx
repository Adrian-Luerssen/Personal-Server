import React, { useId } from 'react'

export default function InstrumentPanel({ title, label, action, domain = 'today', className = '', children }) {
  const headingId = useId()
  return (
    <section className={`instrument-panel ${className}`.trim()} data-domain={domain} aria-labelledby={headingId}>
      <header className="instrument-panel__header">
        <div>{label ? <span>{label}</span> : null}<h2 id={headingId}>{title}</h2></div>
        {action}
      </header>
      <div className="instrument-panel__body">{children}</div>
    </section>
  )
}
