import React from 'react'

export function Register({ action, children, className = '', description, title, ...props }) {
  return (
    <section className={`record-register ${className}`.trim()} {...props}>
      {(title || description || action) && (
        <header className="record-register__header">
          <div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>
          {action && <div className="record-register__action">{action}</div>}
        </header>
      )}
      <div className="record-register__body">{children}</div>
    </section>
  )
}

export function RegisterRow({ action, children, className = '', leading, meta, state, ...props }) {
  return (
    <div className={`record-register__row ${className}`.trim()} {...props}>
      {leading && <div className="record-register__leading">{leading}</div>}
      <div className="record-register__content">{children}</div>
      {meta && <div className="record-register__meta">{meta}</div>}
      {state && <div className="record-register__state">{state}</div>}
      {action && <div className="record-register__row-action">{action}</div>}
    </div>
  )
}

export function RegisterDivider({ label }) {
  return <div className="record-register__divider">{label && <span>{label}</span>}</div>
}

export default Register
