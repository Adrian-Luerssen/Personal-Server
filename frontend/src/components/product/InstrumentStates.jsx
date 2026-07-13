import React from 'react'

export function EmptyInstrument({ title, detail, action, domain = 'today' }) {
  return <div className="instrument-state" data-domain={domain}><span aria-hidden="true" /><div><strong>{title}</strong><p>{detail}</p></div>{action}</div>
}

export function LoadingInstrument({ label = 'Loading records', rows = 3, domain = 'today' }) {
  return <div className="instrument-loading" data-domain={domain} role="status" aria-label={label}>{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>
}
