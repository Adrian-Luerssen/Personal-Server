import React from 'react'

export default function RecordRow({ icon, title, detail, value, meta, action, domain = 'today' }) {
  return (
    <div className="instrument-record-row" data-domain={domain}>
      {icon ? <span className="instrument-record-row__icon" aria-hidden="true">{icon}</span> : null}
      <div className="instrument-record-row__copy"><strong>{title}</strong>{detail ? <small>{detail}</small> : null}</div>
      <div className="instrument-record-row__value">{value ? <output>{value}</output> : null}{meta ? <small>{meta}</small> : null}</div>
      {action ? <div className="instrument-record-row__action">{action}</div> : null}
    </div>
  )
}
