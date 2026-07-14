import React from 'react'

export default function PageHeading({ actions, children, className = '', description, eyebrow, meta, title }) {
  return (
    <header className={`record-page-heading ${className}`.trim()}>
      <div className="record-page-heading__copy">
        {eyebrow && <span>{eyebrow}</span>}
        <h1>{title}</h1>
        {(description || children) && <div className="record-page-heading__description">{description && <p>{description}</p>}{children}</div>}
        {meta && <span className="record-page-heading__meta">{meta}</span>}
      </div>
      {actions && <div className="record-page-heading__actions">{actions}</div>}
    </header>
  )
}
