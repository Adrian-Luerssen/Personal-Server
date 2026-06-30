import React from 'react'
import Icon from '../icons/Icon'

export function StatusPill({ children, tone = 'neutral', icon }) {
  return (
    <span className={`record-status-pill record-status-pill--${tone}`}>
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  )
}

export function MetricCard({ label, value, note, icon, tone = 'neutral' }) {
  return (
    <article className={`record-metric-card record-metric-card--${tone}`}>
      <div className="record-metric-card__top">
        {icon ? <Icon name={icon} size={16} /> : null}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {note ? <p>{note}</p> : null}
    </article>
  )
}

export function EmptyState({ title = 'No records yet.', text, action, icon = 'file-search' }) {
  return (
    <section className="record-empty-state">
      <span className="record-empty-state__icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <h3>{title}</h3>
        {text ? <p>{text}</p> : null}
      </div>
      {action || null}
    </section>
  )
}

export function ReviewPanel({ eyebrow, title, text, children, action }) {
  return (
    <section className="record-review-panel">
      <div className="record-review-panel__copy">
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
      </div>
      {children ? <div className="record-review-panel__body">{children}</div> : null}
      {action ? <div className="record-review-panel__action">{action}</div> : null}
    </section>
  )
}

export function RecordRow({ source, title, meta, value, tone = 'neutral' }) {
  return (
    <div className={`record-row record-row--${tone}`}>
      <span>{source}</span>
      <strong>{title}</strong>
      {meta ? <em>{meta}</em> : null}
      {value ? <b>{value}</b> : null}
    </div>
  )
}
